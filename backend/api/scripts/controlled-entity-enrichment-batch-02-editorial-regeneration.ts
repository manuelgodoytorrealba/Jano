import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';

const root = resolve(process.cwd(), '../..');
const artifact = (name: string) => resolve(root, `artifacts/${name}`);
const targets = ['pablo-picasso', 'cubismo', 'el-nacimiento-de-venus'];
const beforePath = artifact(
  'controlled-entity-enrichment-batch-02-before-editorial-regeneration.json',
);
const previewPath = artifact('controlled-entity-enrichment-batch-02-editorial-preview-v4.json');
const reportPath = artifact('controlled-entity-enrichment-batch-02-editorial-apply-report.json');
const finalPath = artifact('controlled-entity-enrichment-batch-02-final-report.json');
const outputDir = resolve(
  process.cwd(),
  process.argv.find((value) => value.startsWith('--output='))?.split('=')[1] ??
    '/tmp/editorial-b02-v4',
);
const apply = process.argv.includes('--apply');

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL_REQUIRED');
  const url = new URL(rawUrl);
  if (
    url.pathname !== '/jano' ||
    !(
      (url.hostname === 'db' && url.port === '5432') ||
      (url.hostname === '127.0.0.1' && url.port === '55432')
    )
  )
    throw new Error('DATABASE_SAFETY_BLOCK');
  mkdirSync(resolve(root, 'artifacts'), { recursive: true });
  const prisma = new PrismaService();
  await prisma.$connect();
  const entities = await prisma.entity.findMany({
    where: { slug: { in: targets } },
    include: { sourceRefs: true, translations: true },
  });
  if (entities.length !== targets.length) throw new Error('EDITORIAL_TARGET_MISSING');
  const records = entities.map((entity) => ({
    entityId: entity.id,
    title: entity.title,
    slug: entity.slug,
    summary: entity.summary,
    content: entity.content,
    contentLevel: entity.contentLevel,
    translations: entity.translations,
    canonicalContextFingerprint: hash(
      entity.sourceRefs
        .filter((ref) => ref.note?.startsWith('['))
        .map((ref) => ({ id: ref.id, note: ref.note, quote: ref.quote })),
    ),
    editorialFingerprint: hash({
      summary: entity.summary,
      content: entity.content,
      contentLevel: entity.contentLevel,
    }),
  }));
  if (!existsSync(beforePath))
    writeFileSync(
      beforePath,
      `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', createdAt: new Date().toISOString(), targets: records }, null, 2)}\n`,
    );
  const previews = targets.map((slug) => {
    const path = resolve(outputDir, `claim-level-editorial-v1-${slug}.json`);
    if (!existsSync(path)) throw new Error(`PREVIEW_MISSING:${slug}`);
    const generated = JSON.parse(readFileSync(path, 'utf8'));
    const before = records.find((record) => record.slug === slug)!;
    return {
      entityId: before.entityId,
      title: before.title,
      slug,
      currentSummary: before.summary,
      proposedSummary: generated.publicOutput?.summary ?? null,
      currentContent: before.content,
      proposedContent: generated.publicOutput?.essay ?? null,
      currentContentLevel: before.contentLevel,
      proposedContentLevel: 'INTERMEDIATE',
      claimsUsed: generated.acceptedClaims ?? [],
      claimMap: generated.sentenceToClaimMapping ?? [],
      validation: generated.entailment ?? null,
      privateResearchInputs: 0,
      model: generated.model,
      realWriterRuntimeUsed: generated.model?.provider === 'ollama',
      quality:
        !before.summary && !before.content && generated.publicOutput
          ? 'CLEAR_IMPROVEMENT'
          : 'NO_MEANINGFUL_IMPROVEMENT',
      status:
        generated.publicOutput && !generated.entailment?.rejected?.length ? 'PASS' : 'BLOCKED',
      blockedReason: generated.entailment?.rejected?.length ? 'GROUNDING_AUDIT_FAILED' : null,
    };
  });
  writeFileSync(
    previewPath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', input: 'canonical knowledge only', previews }, null, 2)}\n`,
  );
  const blocked = previews.filter(
    (preview) => preview.status !== 'PASS' || preview.quality === 'NO_MEANINGFUL_IMPROVEMENT',
  );
  const counts = async () => ({
    entities: await prisma.entity.count(),
    relations: await prisma.relation.count(),
    sources: await prisma.source.count(),
    researchEvidence: await prisma.researchEvidence.count(),
    sourceRefs: await prisma.sourceRef.count(),
    citations: await prisma.citation.count(),
  });
  const beforeCounts = await counts();
  if (apply && !blocked.length)
    await prisma.$transaction(
      previews.map((preview) =>
        prisma.entity.update({
          where: { id: preview.entityId },
          data: {
            summary: preview.proposedSummary,
            content: preview.proposedContent,
            contentLevel: 'INTERMEDIATE',
          },
        }),
      ),
    );
  const afterCounts = await counts();
  const structuralDelta = Object.fromEntries(
    Object.entries(afterCounts).map(([key, value]) => [
      key,
      value - beforeCounts[key as keyof typeof beforeCounts],
    ]),
  );
  const applied = apply && !blocked.length;
  writeFileSync(
    reportPath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', applied, reason: applied ? 'GROUNDING_AND_QUALITY_GATES_PASSED' : blocked.length ? 'EDITORIAL_GATE_BLOCKED' : 'DRY_RUN', targets, editorialApplied: applied ? targets : [], databaseMutated: applied, allowedFields: ['summary', 'content', 'contentLevel'], privateResearchInputs: 0, beforeCounts, afterCounts, structuralDelta, createdAt: new Date().toISOString() }, null, 2)}\n`,
  );
  writeFileSync(
    finalPath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', canonical: 'SUCCESS', editorial: applied ? 'SUCCESS' : blocked.length ? 'BLOCKED' : 'READY_TO_APPLY', targets: previews.map(({ title, slug, status, quality }) => ({ title, slug, grounding: status, quality, applied })), privateResearchInputs: 0, knowledgeCoreChangedDuringEditorial: Object.values(structuralDelta).some(Boolean), createdAt: new Date().toISOString() }, null, 2)}\n`,
  );
  await prisma.$disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
