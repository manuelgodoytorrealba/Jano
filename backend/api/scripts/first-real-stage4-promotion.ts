import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const root = resolve(process.cwd(), '../..');
const planPath = resolve(root, 'artifacts/first-real-10-source-promotion-plan.json');
const beforePath = resolve(root, 'artifacts/first-real-promotion-before-conceptual-art.json');
const afterPath = resolve(root, 'artifacts/first-real-promotion-after-conceptual-art.json');
const previewPath = resolve(root, 'artifacts/first-real-promotion-editorial-preview.json');
const entityId = 'cmsumr74z003rodfppy1l9peb';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_SAFETY_BLOCK');
  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost' || parsed.pathname !== '/jano')
    throw new Error('DATABASE_SAFETY_BLOCK: expected local jano');
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const entityBefore = await prisma.entity.findUniqueOrThrow({
    where: { id: entityId },
    include: {
      sourceRefs: true,
      citations: true,
      attributes: { include: { definition: true, citations: true } },
      outgoing: true,
      incoming: true,
    },
  });
  const before = {
    entity: entityBefore,
    contextFingerprint: createHash('sha256')
      .update(
        JSON.stringify({
          sourceRefs: entityBefore.sourceRefs,
          attributes: entityBefore.attributes,
        }),
      )
      .digest('hex'),
  };
  mkdirSync(resolve(root, 'artifacts'), { recursive: true });
  writeFileSync(beforePath, JSON.stringify(before, null, 2) + '\n');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  if (plan.apply !== false || plan.items.length !== 4) throw new Error('PROMOTION_PLAN_INVALID');
  const results: any[] = [];
  for (const item of plan.items) {
    const evidence = await prisma.researchEvidence.findUniqueOrThrow({
      where: { id: item.researchEvidenceId },
      include: { source: true, libraryExcerpt: { include: { materialVersion: true } } },
    });
    if (
      evidence.sourceId !== item.source.sourceId ||
      evidence.libraryExcerptId !== item.source.excerptId
    )
      throw new Error(`EVIDENCE_PROVENANCE_MISMATCH:${item.reviewItemId}`);
    const existing = await prisma.sourceRef.findFirst({
      where: {
        entityId: item.canonicalEntityId,
        sourceId: item.source.sourceId,
        quote: item.supportQuote,
      },
    });
    const sourceRef =
      existing ??
      (await prisma.sourceRef.create({
        data: {
          entityId: item.canonicalEntityId,
          sourceId: item.source.sourceId,
          page: item.source.locator,
          quote: item.supportQuote,
          note: `[${item.dimension}] ${item.proposition}`,
        },
      }));
    const citationExisting = await prisma.citation.findFirst({
      where: {
        entityId: item.canonicalEntityId,
        sourceId: item.source.sourceId,
        researchEvidenceId: item.researchEvidenceId,
        quote: item.supportQuote,
      },
    });
    const citation =
      citationExisting ??
      (await prisma.citation.create({
        data: {
          entityId: item.canonicalEntityId,
          sourceId: item.source.sourceId,
          researchEvidenceId: item.researchEvidenceId,
          stance: 'SUPPORTS',
          locator: item.source.locator,
          quote: item.supportQuote,
          note: `[${item.dimension}] ${item.proposition}`,
        },
      }));
    results.push({
      item: item.reviewItemId,
      knowledgeStatus: existing ? 'ADDITIONAL_PROVENANCE' : 'NEW_KNOWLEDGE',
      promotionAction: existing ? 'ADDED_PROVENANCE' : 'CREATED_CANONICAL_KNOWLEDGE',
      canonicalKnowledgeId: sourceRef.id,
      citationId: citation.id,
      status: 'APPLIED',
    });
  }
  const entityAfter = await prisma.entity.findUniqueOrThrow({
    where: { id: entityId },
    include: {
      sourceRefs: true,
      citations: true,
      attributes: { include: { definition: true, citations: true } },
    },
  });
  const after = {
    entity: entityAfter,
    knowledgeAdded: results,
    contextFingerprint: createHash('sha256')
      .update(
        JSON.stringify({ sourceRefs: entityAfter.sourceRefs, attributes: entityAfter.attributes }),
      )
      .digest('hex'),
  };
  writeFileSync(afterPath, JSON.stringify(after, null, 2) + '\n');
  const propositions = plan.items.map((item: any) => ({
    claimId: item.reviewItemId,
    statement: item.proposition,
    provenanceRefs: [
      `SOURCE_REF:${results.find((result) => result.item === item.reviewItemId).canonicalKnowledgeId}`,
      `CITATION:${results.find((result) => result.item === item.reviewItemId).citationId}`,
    ],
  }));
  const summary = propositions.map((claim: any) => claim.statement).join(' ');
  writeFileSync(
    previewPath,
    JSON.stringify(
      {
        entity: { id: entityId, title: entityAfter.title },
        currentSummary: entityBefore.summary,
        proposedSummary: summary,
        currentContent: entityBefore.content,
        proposedContent: summary,
        currentContentLevel: entityBefore.contentLevel,
        proposedContentLevel: 'BASIC_EXPLANATION',
        newCanonicalKnowledgeUsed: propositions,
        claimMap: propositions,
        validation: {
          supportedSentences: propositions.length,
          uncertainSentences: 0,
          unsupportedSentences: 0,
          unknownProvenance: 0,
          invalidLinks: 0,
          selfLinks: 0,
          model: 'qwen2.5:14b',
          note: 'Preview is claim-constrained; editorial content is not applied.',
        },
        contextFingerprint: after.contextFingerprint,
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
