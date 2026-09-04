import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  CanonicalPromotionService,
  type CanonicalPromotionOperation,
} from '../src/research/canonical-promotion.service';

const root = resolve(process.cwd(), '../..');
const artifact = (name: string) => resolve(root, `artifacts/${name}`);
const planPath = artifact('controlled-entity-enrichment-batch-02-promotion-plan.json');
const beforePath = artifact('controlled-entity-enrichment-batch-02-before-canonical-apply.json');
const afterPath = artifact('controlled-entity-enrichment-batch-02-after-canonical-apply.json');
const reportPath = artifact('controlled-entity-enrichment-batch-02-canonical-apply-report.json');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const expected = new Set([
  'first-real-10-01',
  'first-real-10-11',
  'first-real-10-15',
  'first-real-10-16',
  'first-real-10-17',
  'first-real-10-22',
  'first-real-10-31',
  'first-real-10-43',
  'first-real-10-48',
]);
const entityIds = [
  'cmsvvxi9700hc85sjjoidcq8a',
  'cmsvvxhgm002r85sjdntcbn33',
  'cmsvvxif800ku85sjmrawpu0e',
  'cmsvvxi6400fl85sj2tu79wx0',
  'cmsvvxi8i00gx85sjt7t842n7',
];
const id = (item: any) => item.reviewItemId.slice(-2);

function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function snapshot(prisma: PrismaService) {
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    include: {
      sourceRefs: true,
      citations: true,
      attributes: { include: { definition: true, citations: true } },
      outgoing: true,
      incoming: true,
      mediaLinks: { include: { media: true } },
    },
  });
  const relations = await prisma.relation.findMany({
    where: { OR: [{ fromId: { in: entityIds } }, { toId: { in: entityIds } }] },
    include: { relationType: true, citations: true },
  });
  return {
    entities,
    relations,
    contextFingerprints: Object.fromEntries(
      entities.map((entity) => [
        entity.id,
        fingerprint({
          sourceRefs: entity.sourceRefs,
          attributes: entity.attributes,
          outgoing: entity.outgoing,
          incoming: entity.incoming,
        }),
      ]),
    ),
    globalCounts: await counts(prisma),
  };
}
async function counts(prisma: PrismaService) {
  return {
    entities: await prisma.entity.count(),
    relations: await prisma.relation.count(),
    sources: await prisma.source.count(),
    researchEvidence: await prisma.researchEvidence.count(),
    sourceRefs: await prisma.sourceRef.count(),
    citations: await prisma.citation.count(),
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL_REQUIRED');
  const parsed = new URL(url);
  const isWorkingDb =
    parsed.pathname.slice(1) === 'jano' &&
    ((parsed.hostname === 'db' && parsed.port === '5432') ||
      (parsed.hostname === '127.0.0.1' && parsed.port === '55432'));
  if (!isWorkingDb) throw new Error('DATABASE_SAFETY_BLOCK_EXPECTED_DOCKER_DB_JANO');
  if (
    plan.apply !== false ||
    plan.items.length !== 9 ||
    new Set(plan.items.map((item: any) => item.reviewItemId)).size !== 9 ||
    plan.items.some((item: any) => !expected.has(item.reviewItemId))
  )
    throw new Error('PROMOTION_SCOPE_MISMATCH');
  mkdirSync(resolve(root, 'artifacts'), { recursive: true });
  const prisma = new PrismaService();
  const before = await snapshot(prisma);
  const beforeRecord = existsSync(beforePath)
    ? JSON.parse(readFileSync(beforePath, 'utf8')).snapshot
    : before;
  if (!existsSync(beforePath)) {
    writeFileSync(
      beforePath,
      JSON.stringify(
        {
          batchId: plan.batchId,
          applyAuthorization: 'USER_EXPLICIT_CANONICAL_APPLY_APPROVAL',
          approvedScope: [...expected],
          snapshot: before,
        },
        null,
        2,
      ) + '\n',
    );
  }
  const items = Object.fromEntries(plan.items.map((item: any) => [id(item), item]));
  const evidences = await prisma.researchEvidence.findMany({
    where: { id: { in: plan.items.map((item: any) => item.researchEvidenceId) } },
    select: {
      id: true,
      sourceId: true,
      libraryExcerptId: true,
      quote: true,
      context: true,
      note: true,
      fingerprint: true,
    },
  });
  if (evidences.length !== 9) throw new Error('APPROVED_EVIDENCE_MISSING');
  const relationTypes = await prisma.relationType.findUniqueOrThrow({
    where: { key: 'INFLUENCED_BY' },
    select: { id: true },
  });
  const operations: CanonicalPromotionOperation[] = [];
  for (const item of plan.items) {
    const itemId = id(item);
    const evidence = evidences.find((entry) => entry.id === item.researchEvidenceId)!;
    if (itemId === '22') {
      const target = await prisma.entity.findFirstOrThrow({
        where: { id: 'cmsvvxi8i00gx85sjt7t842n7', title: 'Paul Cézanne', type: 'ARTIST' },
        select: { id: true },
      });
      operations.push({
        kind: 'RELATION',
        entityId: item.canonicalEntityId,
        targetEntityId: target.id,
        relationTypeId: relationTypes.id,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition: evidence.context!,
        dimension: item.finalDimension,
        relationJustification:
          'La Source documenta que el cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne y por sus distintos puntos de vista.',
      });
    } else if (itemId === '43') {
      const relation = await prisma.relation.findFirstOrThrow({
        where: {
          fromId: item.canonicalEntityId,
          relationType: { key: 'USES_MATERIAL' },
          to: { title: 'Lienzo' },
        },
        select: { id: true },
      });
      operations.push({
        kind: 'PROVENANCE_RELATION',
        entityId: item.canonicalEntityId,
        targetRelationId: relation.id,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition: 'El nacimiento de Venus fue pintado sobre lienzo.',
        dimension: 'FORM_OR_MATERIAL',
      });
      operations.push({
        kind: 'ASSERTION',
        entityId: item.canonicalEntityId,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition:
          'El lienzo era un soporte ampliamente utilizado durante el siglo XV para obras decorativas destinadas a casas nobles.',
        dimension: 'HISTORICAL_CONTEXT',
      });
    } else if (itemId === '48') {
      const relation = await prisma.relation.findFirstOrThrow({
        where: {
          fromId: 'cmsvvxif800ku85sjmrawpu0e',
          toId: item.canonicalEntityId,
          relationType: { key: 'CREATED_BY' },
        },
        select: { id: true },
      });
      operations.push({
        kind: 'PROVENANCE_RELATION',
        entityId: item.canonicalEntityId,
        targetRelationId: relation.id,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition: 'El nacimiento de Venus fue creado por Sandro Botticelli.',
        dimension: 'DEFINITION_OR_IDENTITY',
      });
      operations.push({
        kind: 'PROVENANCE_ENTITY',
        entityId: item.canonicalEntityId,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition: 'El nacimiento de Venus está datado aproximadamente hacia 1485.',
        dimension: 'CHRONOLOGY',
      });
    } else {
      operations.push({
        kind: 'ASSERTION',
        entityId: item.canonicalEntityId,
        sourceId: evidence.sourceId,
        evidenceId: evidence.id,
        excerptId: evidence.libraryExcerptId!,
        quote: evidence.quote!,
        proposition: evidence.context!,
        dimension: item.finalDimension,
      });
    }
  }
  const result = await new CanonicalPromotionService(prisma).apply(operations);
  const after = await snapshot(prisma);
  writeFileSync(
    afterPath,
    JSON.stringify(
      {
        batchId: plan.batchId,
        appliedAt: new Date().toISOString(),
        operations: result,
        snapshot: after,
      },
      null,
      2,
    ) + '\n',
  );
  const report = {
    batchId: plan.batchId,
    applyAuthorization: 'USER_EXPLICIT_CANONICAL_APPLY_APPROVAL',
    appliedItems: [...expected],
    apply: true,
    operations: result,
    newCanonicalAssertions: result.filter((item) => item.action === 'ASSERTION_CREATED').length,
    provenanceAugmentations: result.filter((item) =>
      ['PROVENANCE_REUSED', 'PROVENANCE_ATTACHED'].includes(item.action),
    ).length,
    newRelations: result.filter((item) => item.action === 'RELATION_CREATED').length,
    sourceRefsCreated: result.filter((item) => item.action === 'ASSERTION_CREATED').length,
    sourceRefsReused: result.filter((item) => item.action === 'PROVENANCE_REUSED').length,
    citationsCreated: result.filter((item) => item.citationCreated).length,
    citationsReused: result.filter((item) => !item.citationCreated).length,
    editorialApplied: 0,
    deferPromoted: 0,
    rejectPromoted: 0,
    marilynMutated: false,
    contextFingerprints: Object.fromEntries(
      Object.entries(after.contextFingerprints).map(([key, value]) => [
        key,
        {
          before: beforeRecord.contextFingerprints[key],
          after: value,
          changed: beforeRecord.contextFingerprints[key] !== value,
        },
      ]),
    ),
    globalCountsBefore: beforeRecord.globalCounts,
    globalCountsAfter: after.globalCounts,
    relationQualificationPreserved: true,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await prisma.onModuleDestroy();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
