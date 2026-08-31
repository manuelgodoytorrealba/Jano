import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const root = resolve(process.cwd(), '../..');
const input = resolve(root, 'artifacts/first-real-10-source-batch.json');
const output = resolve(root, 'artifacts/first-real-10-source-human-review-packet.json');
const planOutput = resolve(root, 'artifacts/first-real-10-source-promotion-plan.json');
const DIMENSIONS = new Set([
  'DEFINITION_OR_IDENTITY',
  'CHRONOLOGY',
  'PLACE',
  'FORM_OR_MATERIAL',
  'PRACTICE_OR_METHOD',
  'HISTORICAL_CONTEXT',
  'RELATION',
  'INTERPRETATION',
  'RECEPTION_OR_LEGACY',
  'PROVENANCE_OR_COMMISSION',
]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_SAFETY_BLOCK: DATABASE_URL is required');
  const parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1', 'db', '::1'].includes(parsed.hostname) &&
    !parsed.hostname.endsWith('.local')
  )
    throw new Error('DATABASE_SAFETY_BLOCK: non-local database');
  const artifact = JSON.parse(readFileSync(input, 'utf8'));
  const rows = artifact.rows.flatMap((row: any) =>
    row.classifications.map((classification: any) => ({ source: row.source, ...classification })),
  );
  const selected = rows.filter(
    (row: any) =>
      row.result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' ||
      ['MODEL_REVIEW', 'SYSTEM_FAILSAFE_REVIEW'].includes(row.result.reviewKind),
  );
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const selectedExcerpts = await prisma.libraryExcerpt.findMany({
    where: { id: { in: selected.map((row: any) => row.excerptId) } },
    include: { materialVersion: true },
  });
  const versionIds = [...new Set(selectedExcerpts.map((excerpt) => excerpt.materialVersionId))];
  const allExcerpts = await prisma.libraryExcerpt.findMany({
    where: { materialVersionId: { in: versionIds } },
    orderBy: [{ materialVersionId: 'asc' }, { locator: 'asc' }],
  });
  const excerptMap = new Map(selectedExcerpts.map((excerpt) => [excerpt.id, excerpt]));
  const siblingMap = new Map<string, any[]>();
  for (const excerpt of allExcerpts)
    siblingMap.set(excerpt.materialVersionId, [
      ...(siblingMap.get(excerpt.materialVersionId) ?? []),
      excerpt,
    ]);
  const items = selected.map((row: any, index: number) => {
    const result = row.result;
    const excerpt = excerptMap.get(row.excerptId);
    const group = excerpt ? (siblingMap.get(excerpt.materialVersionId) ?? []) : [];
    const position = group.findIndex((item) => item.id === row.excerptId);
    const quoteStatus = ['VALID_EXACT', 'VALID_NORMALIZED'].includes(result.supportQuoteStatus)
      ? result.supportQuoteStatus
      : 'INVALID';
    const raw = result.evidenceProposition?.statement ?? null;
    const dimension =
      result.supportedDimension ?? result.evidenceProposition?.supportedDimension ?? null;
    const normalizedDimension = DIMENSIONS.has(dimension) ? dimension : null;
    const atomicityStatus =
      result.atomic === false ||
      String(raw ?? '')
        .split(/[.!?]+/)
        .filter(Boolean).length > 1 ||
      String(raw ?? '').length > 320
        ? 'MULTI_CLAIM_REQUIRES_SPLIT'
        : 'ATOMIC';
    const candidateTokens = String(row.entity.title)
      .toLowerCase()
      .split(/\s+/)
      .filter((token: string) => !['art', 'the', 'of'].includes(token));
    const contextDependent =
      !candidateTokens.some((token: string) =>
        new RegExp(`\\b${token}\\b`, 'i').test(String(result.supportQuote ?? '')),
      ) && result.relevanceRole === 'PRIMARY_SUBJECT';
    const ephemeral =
      /admission|membership|opening hours|visitor|welcome center|symposium|class|register now|events?|visitor information/i.test(
        String(excerpt?.text ?? ''),
      );
    const suggestion =
      result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' &&
      quoteStatus !== 'INVALID' &&
      atomicityStatus === 'ATOMIC' &&
      normalizedDimension &&
      result.entityCentered === true &&
      result.unsupportedAddition === 'NONE'
        ? 'APPROVE'
        : result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' && quoteStatus === 'INVALID'
          ? 'REJECT'
          : 'DEFER';
    return {
      reviewItemId: `first-real-10-${String(index + 1).padStart(2, '0')}`,
      source: row.source,
      entity: row.entity,
      excerptId: row.excerptId,
      excerpt: excerpt?.text ?? null,
      previousContext: position > 0 ? group[position - 1].text : null,
      nextContext: position >= 0 && position < group.length - 1 ? group[position + 1].text : null,
      rawModelProposition: raw,
      validatedProposition:
        quoteStatus !== 'INVALID' && result.unsupportedAddition === 'NONE' ? raw : null,
      supportQuote: result.supportQuote ?? null,
      v3Decision: result.reviewKind ?? result.decision,
      reviewKind: result.reviewKind ?? null,
      quoteStatus,
      atomicityStatus,
      entityCentered: result.entityCentered ?? null,
      contextDependent,
      ephemeralOrInstitutionalContext: ephemeral,
      role: result.relevanceRole ?? null,
      normalizedDimension,
      dimensionReviewRequired: normalizedDimension === null,
      automatedReviewSuggestion: suggestion,
      automatedReviewReason: result.reason ?? null,
      humanDecision: null,
      humanReason: null,
      confidence: result.confidence ?? null,
      provenance: {
        sourceId: row.source.id,
        locator: excerpt?.locator ?? null,
        materialVersionId: excerpt?.materialVersionId ?? null,
        excerptId: row.excerptId,
      },
    };
  });
  mkdirSync(resolve(root, 'artifacts'), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify(
      {
        batchId: artifact.batchId ?? 'first-real-10-source-batch',
        workingDatabase: { host: parsed.hostname, name: parsed.pathname.slice(1).split('?')[0] },
        humanDecisionContract: ['APPROVE', 'REJECT', 'DEFER'],
        humanDecisionsPending: true,
        items,
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    planOutput,
    JSON.stringify(
      {
        batchId: artifact.batchId ?? 'first-real-10-source-batch',
        apply: false,
        items: [],
        reason: 'No promotion before explicit human review.',
      },
      null,
      2,
    ) + '\n',
  );
  await prisma.$disconnect();
  await pool.end();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
