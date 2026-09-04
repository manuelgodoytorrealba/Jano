import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const root = resolve(process.cwd(), '../..');
const packetPath = resolve(root, 'artifacts/first-real-10-source-human-review-packet.json');
const decisionsPath = resolve(root, 'artifacts/first-real-10-source-human-review-decisions.json');
const deferPath = resolve(root, 'artifacts/first-real-10-source-defer-repair-plan.json');
const planPath = resolve(root, 'artifacts/first-real-10-source-promotion-plan.json');
const projectId = 'cmt300fjm0002z3fpyx1zpudf';
const approve = new Set(['13', '15', '16', '18']);
const reject = new Set(['06', '20', '24', '25', '26', '27']);
const dimensions: Record<string, string> = {
  '13': 'DEFINITION_OR_IDENTITY',
  '15': 'CHRONOLOGY',
  '16': 'PRACTICE_OR_METHOD',
  '18': 'PRACTICE_OR_METHOD',
};
const reasons: Record<string, string> = {
  '13': 'Definición directa, atómica, centrada en la entidad, quote exacta y provenance válida.',
  '15': 'Claim cronológico/histórico soportado por quote normalizada, atómico y trazable.',
  '16': 'Claim sustantivo y directamente soportado sobre la práctica conceptual.',
  '18': 'Claim sustantivo y directamente soportado sobre materiales y formas de trabajo.',
  '06': 'Quote inválida y multi-claim; no está lista para promotion.',
  '20': 'Evento contemporáneo del museo, no conocimiento sustantivo sobre Rodin.',
  '24': 'Información incidental del Welcome Center.',
  '25': 'Evento/horario del museo, no conocimiento sobre la artista.',
  '26': 'Clase contemporánea sobre una obra; contexto institucional efímero.',
  '27': 'Fundraising/membership institucional, no Evidence sustantiva sobre el legado artístico.',
};
const deferActions: Record<string, string[]> = {
  '01': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '02': ['REPAIR_PROPOSITION'],
  '03': ['RESOLVE_CONTEXT', 'REPAIR_PROPOSITION'],
  '04': ['RESOLVE_CONTEXT', 'NORMALIZE_DIMENSION'],
  '05': ['RESOLVE_CONTEXT', 'REPAIR_PROPOSITION'],
  '07': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '08': ['NORMALIZE_DIMENSION'],
  '09': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '10': ['NORMALIZE_QUOTE', 'REPAIR_PROPOSITION'],
  '11': ['REPAIR_PROPOSITION'],
  '12': ['RESOLVE_CONTEXT', 'REPAIR_PROPOSITION'],
  '14': ['SPLIT_CLAIMS', 'NORMALIZE_QUOTE'],
  '17': ['NORMALIZE_QUOTE', 'REPAIR_PROPOSITION'],
  '19': ['REPAIR_PROPOSITION'],
  '21': ['SPLIT_CLAIMS', 'REROUTE_ENTITY', 'REROUTE_RELATION'],
  '22': ['REROUTE_ENTITY'],
  '23': ['REROUTE_ENTITY', 'REROUTE_RELATION'],
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_SAFETY_BLOCK');
  const dbUrl = new URL(url);
  if (
    !['localhost', '127.0.0.1', 'db', '::1'].includes(dbUrl.hostname) &&
    !dbUrl.hostname.endsWith('.local')
  )
    throw new Error('DATABASE_SAFETY_BLOCK');
  const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
  const now = new Date().toISOString();
  const decisions = packet.items.map((item: any) => {
    const slot = item.reviewItemId.slice(-2);
    const humanDecision = approve.has(slot) ? 'APPROVE' : reject.has(slot) ? 'REJECT' : 'DEFER';
    return {
      batchId: packet.batchId,
      reviewItemId: item.reviewItemId,
      humanDecision,
      humanReason:
        reasons[slot] ?? `Pendiente: ${deferActions[slot]?.join(', ') ?? 'requiere más contexto'}.`,
      decisionConfirmedAt: now,
      decisionSource: 'USER_CONFIRMED_REVIEW',
    };
  });
  writeFileSync(
    decisionsPath,
    JSON.stringify({ batchId: packet.batchId, decisions }, null, 2) + '\n',
  );
  writeFileSync(
    deferPath,
    JSON.stringify(
      {
        batchId: packet.batchId,
        items: decisions
          .filter((d: any) => d.humanDecision === 'DEFER')
          .map((d: any) => {
            const item = packet.items.find((x: any) => x.reviewItemId === d.reviewItemId);
            return {
              reviewItemId: d.reviewItemId,
              entity: item.entity,
              source: item.source,
              originalProposition: item.rawModelProposition,
              deferActions: deferActions[d.reviewItemId.slice(-2)] ?? [],
              reason: d.humanReason,
              status: 'PENDING',
            };
          }),
      },
      null,
      2,
    ) + '\n',
  );
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const approved = packet.items.filter((item: any) => approve.has(item.reviewItemId.slice(-2)));
  const validation = approved.map((item: any) => ({
    item,
    valid:
      item.quoteStatus !== 'INVALID' &&
      !!item.validatedProposition &&
      item.atomicityStatus === 'ATOMIC' &&
      item.entityCentered === true &&
      !!item.provenance.sourceId &&
      !!item.provenance.excerptId,
  }));
  const validApproved = validation.filter((entry: any) => entry.valid);
  const existingBefore = await prisma.researchEvidence.count();
  const promotionItems: any[] = [];
  for (const { item } of validApproved) {
    const sourceVersion = 'material-v1';
    const quote = item.supportQuote;
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          sourceId: item.provenance.sourceId,
          excerptId: item.provenance.excerptId,
          quote,
          proposition: item.validatedProposition,
          entityId: item.entity.id,
        }),
      )
      .digest('hex');
    await prisma.researchProjectSource.upsert({
      where: { projectId_sourceId: { projectId, sourceId: item.provenance.sourceId } },
      create: { projectId, sourceId: item.provenance.sourceId },
      update: {},
    });
    if (item.provenance.materialVersionId)
      await prisma.researchLibraryMaterial.upsert({
        where: {
          projectId_materialId: {
            projectId,
            materialId: (
              await prisma.libraryMaterialVersion.findUniqueOrThrow({
                where: { id: item.provenance.materialVersionId },
                select: { materialId: true },
              })
            ).materialId,
          },
        },
        create: {
          projectId,
          materialId: (
            await prisma.libraryMaterialVersion.findUniqueOrThrow({
              where: { id: item.provenance.materialVersionId },
              select: { materialId: true },
            })
          ).materialId,
        },
        update: {},
      });
    const evidence = await prisma.researchEvidence.upsert({
      where: {
        projectId_sourceId_fingerprint: {
          projectId,
          sourceId: item.provenance.sourceId,
          fingerprint,
        },
      },
      create: {
        projectId,
        sourceId: item.provenance.sourceId,
        libraryExcerptId: item.provenance.excerptId,
        sourceVersion,
        locator: item.provenance.locator ?? 'unknown',
        quote,
        context: item.validatedProposition,
        note: `USER_CONFIRMED_REVIEW ${item.reviewItemId}; entity=${item.entity.id}; dimension=${dimensions[item.reviewItemId.slice(-2)]}`,
        fingerprint,
      },
      update: {},
    });
    promotionItems.push({
      reviewItemId: item.reviewItemId,
      researchEvidenceId: evidence.id,
      canonicalEntityId: item.entity.id,
      proposition: item.validatedProposition,
      supportQuote: quote,
      source: item.provenance,
      dimension: dimensions[item.reviewItemId.slice(-2)],
      knowledgeStatus: 'NEW_KNOWLEDGE',
      promotionTarget: 'ENTITY_KNOWLEDGE',
      proposedAction: 'CREATE_CANONICAL_KNOWLEDGE',
    });
  }
  const existingAfter = await prisma.researchEvidence.count();
  writeFileSync(
    planPath,
    JSON.stringify(
      {
        batchId: packet.batchId,
        apply: false,
        items: promotionItems,
        validation: validation.map(({ item, valid }: any) => ({
          reviewItemId: item.reviewItemId,
          entity: item.entity,
          dimension: dimensions[item.reviewItemId.slice(-2)],
          quote: item.quoteStatus,
          atomicity: item.atomicityStatus,
          entityMatch: 'CONFIRMED',
          status: valid ? 'VALID' : 'APPROVED_BUT_BLOCKED',
        })),
        researchEvidenceCreated: existingAfter - existingBefore,
        knowledgeCoreMutated: false,
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
