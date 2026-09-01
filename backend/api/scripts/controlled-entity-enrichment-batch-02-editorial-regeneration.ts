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
const previewPath = artifact('controlled-entity-enrichment-batch-02-editorial-preview-v2.json');
const reportPath = artifact('controlled-entity-enrichment-batch-02-editorial-apply-report.json');

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
  writeFileSync(
    beforePath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', createdAt: new Date().toISOString(), targets: records }, null, 2)}\n`,
  );
  const previews = targets.map((slug) => {
    const path = `/tmp/editorial-b02-v2/claim-level-editorial-v1-${slug}.json`;
    if (!existsSync(path))
      return { slug, status: 'WRITER_RUNTIME_BLOCKED', error: 'PREVIEW_MISSING' };
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
      proposedContentLevel: generated.depth,
      claimsUsed: generated.acceptedClaims ?? [],
      claimMap: generated.sentenceToClaimMapping ?? [],
      validation: generated.entailment ?? null,
      privateResearchInputs: 0,
      model: generated.model,
      realWriterRuntimeUsed: generated.model?.provider === 'ollama',
      status:
        generated.publicOutput && !generated.entailment?.rejected?.length ? 'PASS' : 'BLOCKED',
      blockedReason: generated.entailment?.rejected?.length ? 'GROUNDING_AUDIT_FAILED' : null,
    };
  });
  writeFileSync(
    previewPath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', input: 'canonical knowledge only', previews }, null, 2)}\n`,
  );
  writeFileSync(
    reportPath,
    `${JSON.stringify({ batchId: 'controlled-entity-enrichment-batch-02', applied: false, reason: 'REAL_WRITER_OUTPUT_DID_NOT_PASS_GROUNDING_GATE', targets, editorialApplied: [], databaseMutated: false, privateResearchInputs: 0, createdAt: new Date().toISOString() }, null, 2)}\n`,
  );
  await prisma.$disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
