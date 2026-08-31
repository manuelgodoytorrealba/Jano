import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const input = resolve(process.cwd(), '../../artifacts/first-real-10-source-batch.json');
const output = resolve(process.cwd(), '../../artifacts/first-real-10-source-review-decisions.json');
const planOutput = resolve(
  process.cwd(),
  '../../artifacts/first-real-10-source-promotion-plan.json',
);

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_SAFETY_BLOCK: DATABASE_URL is required');
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', 'db', '::1'].includes(host) && !host.endsWith('.local'))
    throw new Error('DATABASE_SAFETY_BLOCK: non-local database');
  const artifact = JSON.parse(readFileSync(input, 'utf8'));
  const rows = artifact.rows.flatMap((row: any) =>
    row.classifications.map((classification: any) => ({
      source: row.source,
      ...classification,
    })),
  );
  // Stage 2 review queue is deliberately limited to the six deterministic
  // safe-KEEP candidates plus model/system reviews. Semantic recoveries stay
  // out of this first queue until the human contract is explicitly expanded.
  const selected = rows.filter(
    (row: any) =>
      row.result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' ||
      row.result.reviewKind === 'MODEL_REVIEW' ||
      row.result.reviewKind === 'SYSTEM_FAILSAFE_REVIEW',
  );
  const excerpts = new Map<string, any>();
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return prisma.libraryExcerpt
    .findMany({
      where: { id: { in: selected.map((row: any) => row.excerptId) } },
      include: { materialVersion: { include: { material: { include: { source: true } } } } },
    })
    .then((dbExcerpts) => {
      dbExcerpts.forEach((excerpt) => excerpts.set(excerpt.id, excerpt));
      const items = selected.map((row: any, index: number) => {
        const excerpt = excerpts.get(row.excerptId);
        const result = row.result;
        const candidateTokens = String(row.entity.title)
          .toLowerCase()
          .split(/\s+/)
          .filter((token: string) => !['art', 'the', 'of'].includes(token));
        const quoteMentionsCandidate = candidateTokens.some((token: string) =>
          new RegExp(`\\b${token}\\b`, 'i').test(String(result.supportQuote ?? '')),
        );
        const automaticReview =
          result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' &&
          result.supportQuoteStatus?.startsWith('VALID') &&
          result.unsupportedAddition === 'NONE' &&
          result.entityCentered === true &&
          (quoteMentionsCandidate || result.relevanceRole !== 'PRIMARY_SUBJECT')
            ? 'APPROVE'
            : result.compositionSource === 'DETERMINISTIC_SAFE_KEEP' &&
                result.supportQuoteStatus?.startsWith('VALID')
              ? 'DEFER'
              : result.compositionSource === 'DETERMINISTIC_SAFE_KEEP'
                ? 'REJECT'
                : 'DEFER';
        return {
          reviewItemId: `first-real-10-${String(index + 1).padStart(2, '0')}`,
          sourceId: row.source.id,
          sourceTitle: row.source.title,
          excerptId: row.excerptId,
          excerptText: excerpt?.text ?? null,
          candidateEntityId: row.entity.id,
          candidateEntityName: row.entity.title,
          supportQuote: result.supportQuote ?? null,
          evidenceProposition: result.evidenceProposition?.statement ?? null,
          relevanceRole: result.relevanceRole ?? null,
          supportedDimension:
            result.supportedDimension ?? result.evidenceProposition?.supportedDimension ?? null,
          decision: automaticReview,
          reviewer: 'codex-editorial-review',
          humanReason:
            automaticReview === 'APPROVE'
              ? 'Revisión explícita: cita verificable, proposition atómica y centrada, sin adición no soportada.'
              : automaticReview === 'REJECT'
                ? 'Revisión explícita: el candidato SAFE_KEEP tiene una cita inválida/no verificable.'
                : 'Revisión explícita: ambigüedad o fallo de validator; requiere decisión editorial adicional.',
          confidence: result.confidence ?? null,
          reason: result.reason ?? null,
          deterministicClass: result.deterministicClass ?? null,
          compositionSource: result.compositionSource ?? null,
          reviewKind: result.reviewKind ?? null,
          provenance: {
            sourceId: row.source.id,
            locator: excerpt?.locator ?? null,
            materialVersionId: excerpt?.materialVersionId ?? null,
            excerptId: row.excerptId,
          },
          validation: {
            quoteStatus: result.supportQuoteStatus ?? null,
            propositionStatus:
              result.unsupportedAddition === 'NONE'
                ? 'candidate-entailment-pass'
                : 'requires-review',
            uncertaintyPreserved: result.uncertaintyPreserved ?? null,
            entityCentered: result.entityCentered ?? null,
            substantive:
              result.entityCentered === true &&
              result.supportQuoteStatus?.startsWith('VALID') === true,
            sourceAppropriate: row.source.type !== 'STRUCTURED_REFERENCE',
          },
        };
      });
      mkdirSync(resolve(process.cwd(), '../../artifacts'), { recursive: true });
      writeFileSync(
        output,
        JSON.stringify(
          {
            batchId: artifact.batchId ?? 'first-real-10-source-batch',
            workingDatabase: { host, name: new URL(url).pathname.slice(1).split('?')[0] },
            createdAt: new Date().toISOString(),
            humanDecisionContract: ['APPROVE', 'REJECT', 'DEFER'],
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
            reason: 'Stage 2 review artifact only; canonical promotion is intentionally disabled.',
            items: items
              .filter((item: any) => item.decision === 'APPROVE')
              .map((item: any) => ({
                evidenceId: null,
                entityId: item.candidateEntityId,
                proposition: item.evidenceProposition,
                provenance: item.provenance,
                supportedDimension: item.supportedDimension,
                canonicalTarget: 'ENRICH_EXISTING',
                action: 'ENRICH_EXISTING',
                reviewItemId: item.reviewItemId,
              })),
          },
          null,
          2,
        ) + '\n',
      );
      return prisma.$disconnect().finally(() => pool.end());
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
