import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReviewedResearchEvidenceService } from '../src/research/reviewed-research-evidence.service';

const root = resolve(process.cwd(), '../..');
const artifact = (name: string) => resolve(root, `artifacts/${name}`);
const packetPath = artifact('controlled-entity-enrichment-batch-02-human-review-packet.json');
const decisionsPath = artifact('controlled-entity-enrichment-batch-02-human-review-decisions.json');
const deferPath = artifact('controlled-entity-enrichment-batch-02-defer-repair-plan.json');
const planPath = artifact('controlled-entity-enrichment-batch-02-promotion-plan.json');
const projectId = 'cmtg8tquj0000w0sj1tqzrgtq';

const approve = new Set(['01', '11', '15', '16', '17', '22', '31', '43', '48']);
const reject = new Set([
  '13',
  '26',
  '27',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
  '40',
  '42',
  '44',
  '49',
  '50',
  '51',
  '57',
  '58',
  '59',
]);
const defer = new Set([
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '12',
  '14',
  '18',
  '19',
  '20',
  '21',
  '23',
  '24',
  '25',
  '29',
  '33',
  '35',
  '37',
  '39',
  '41',
  '45',
  '46',
  '47',
  '52',
  '53',
  '54',
  '55',
  '56',
  '60',
]);
const actions: Record<string, string[]> = {
  '02': ['REPAIR_PROPOSITION', 'NORMALIZE_DIMENSION'],
  '03': ['SPLIT_CLAIMS', 'REROUTE_ENTITY'],
  '04': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '05': ['RESOLVE_CONTEXT', 'NORMALIZE_DIMENSION'],
  '06': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION', 'RESOLVE_CONTEXT'],
  '07': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '08': ['RESOLVE_CONTEXT'],
  '09': ['NORMALIZE_DIMENSION', 'RESOLVE_CONTEXT'],
  '10': ['NORMALIZE_DIMENSION', 'RESOLVE_CONTEXT'],
  '12': ['REROUTE_ENTITY', 'REROUTE_RELATION'],
  '14': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '18': ['SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '19': ['REPAIR_PROPOSITION', 'RESOLVE_CONTEXT'],
  '20': ['RESOLVE_CONTEXT'],
  '21': ['NORMALIZE_QUOTE', 'REPAIR_PROPOSITION', 'RESOLVE_CONTEXT'],
  '23': ['REROUTE_ENTITY', 'NORMALIZE_DIMENSION'],
  '24': ['NORMALIZE_QUOTE', 'REPAIR_PROPOSITION'],
  '25': ['RESOLVE_CONTEXT', 'REROUTE_ENTITY'],
  '29': ['REPAIR_PROPOSITION', 'SPLIT_CLAIMS', 'NORMALIZE_DIMENSION'],
  '33': ['RESOLVE_CONTEXT'],
  '35': ['REPAIR_PROPOSITION'],
  '37': ['REPAIR_PROPOSITION', 'NORMALIZE_DIMENSION'],
  '39': ['REPAIR_PROPOSITION'],
  '41': ['RESOLVE_CONTEXT', 'REPAIR_PROPOSITION'],
  '45': ['SPLIT_CLAIMS'],
  '46': ['SPLIT_CLAIMS'],
  '47': ['SPLIT_CLAIMS', 'REPAIR_PROPOSITION'],
  '52': ['REROUTE_ENTITY'],
  '53': ['REROUTE_ENTITY', 'REROUTE_RELATION'],
  '54': ['REROUTE_ENTITY', 'NEEDS_MORE_SOURCE_CONTEXT'],
  '55': ['NEEDS_MORE_SOURCE_CONTEXT', 'REROUTE_RELATION'],
  '56': ['REROUTE_ENTITY'],
  '60': ['REROUTE_ENTITY', 'REROUTE_RELATION'],
};
const approved: Record<
  string,
  {
    proposition: string;
    dimension: string;
    reason: string;
    knowledgeStatus: string;
    promotionTarget?: string;
  }
> = {
  '01': {
    proposition:
      'Pablo Picasso recibió el encargo de realizar una gran pintura para el pabellón español de la Exposición Internacional de París de 1937.',
    dimension: 'PROVENANCE_OR_COMMISSION',
    reason: 'Encargo documentado, atómico y trazable.',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '11': {
    proposition:
      'Picasso recurrió a asuntos de la mitología clásica y revisó obras de la tradición artística y del clasicismo francés como parte de su práctica.',
    dimension: 'PRACTICE_OR_METHOD',
    reason: 'Práctica artística directamente sustentada.',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '15': {
    proposition:
      'Tate caracteriza al cubismo como uno de los estilos más influyentes del siglo XX.',
    dimension: 'RECEPTION_OR_LEGACY',
    reason: 'Valoración institucional explícita y atribuida.',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '16': {
    proposition:
      'Se considera generalmente que el cubismo comenzó alrededor de 1907, y que Les Demoiselles d’Avignon ya incluía elementos cubistas.',
    dimension: 'CHRONOLOGY',
    reason: 'Cronología aprobada conservando «generally» y «around».',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '17': {
    proposition:
      'El nombre «cubismo» parece derivar de un comentario de Louis Vauxcelles sobre pinturas de Georges Braque expuestas en París en 1908.',
    dimension: 'HISTORICAL_CONTEXT',
    reason: 'Origen terminológico aprobado conservando «seems».',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '22': {
    proposition:
      'El cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne, en particular por el uso de puntos de vista ligeramente diferentes.',
    dimension: 'RELATION',
    reason: 'Influencia parcial explícitamente documentada.',
    knowledgeStatus: 'NEW_KNOWLEDGE',
    promotionTarget: 'RELATION_PROPOSAL',
  },
  '31': {
    proposition:
      'La composición de El nacimiento de Venus representa a Venus llegando a Chipre desde el mar, impulsada por Céfiro y quizá Aura.',
    dimension: 'DEFINITION_OR_IDENTITY',
    reason: 'Iconografía directamente descrita con incertidumbre preservada.',
    knowledgeStatus: 'NEW_KNOWLEDGE',
  },
  '43': {
    proposition:
      'El nacimiento de Venus fue pintado sobre lienzo, soporte común en el siglo XV para obras decorativas destinadas a casas nobles.',
    dimension: 'FORM_OR_MATERIAL',
    reason: 'Material y contexto de uso directamente sustentados.',
    knowledgeStatus: 'ADDITIONAL_PROVENANCE',
  },
  '48': {
    proposition:
      'Sandro Botticelli es el autor de El nacimiento de Venus, datada aproximadamente hacia 1485.',
    dimension: 'DEFINITION_OR_IDENTITY',
    reason: 'Autoría y datación aproximada documentadas.',
    knowledgeStatus: 'ADDITIONAL_PROVENANCE',
  },
};
const rejectReasons: Record<string, string> = {
  '13': 'Navegación y recomendaciones, no conocimiento sobre Fuente.',
  '26': 'Contexto institucional contemporáneo sobre redevelopment, no conocimiento del Tapiz de Bayeux.',
  '27': 'Información de apertura/acceso institucional, no conocimiento del Tapiz de Bayeux.',
  '28': 'Información web institucional, no conocimiento del Tapiz de Bayeux.',
  '30': 'Información de visita o audioguía, no conocimiento del Tapiz de Bayeux.',
  '32': 'Contenido de la obra atribuido incorrectamente al artista.',
  '34': 'Iconografía de la obra atribuida incorrectamente al artista.',
  '36': 'Contenido de la obra atribuido incorrectamente al artista.',
  '38': 'Interpretación de la obra atribuida incorrectamente al artista.',
  '40': 'Provenance de la obra atribuida incorrectamente al artista.',
  '42': 'Iconografía de la obra atribuida incorrectamente al artista.',
  '44': 'Material de la obra atribuido incorrectamente al artista.',
  '50': 'Contenido de la obra atribuido incorrectamente al artista.',
  '49': 'Repetición del conocimiento iconográfico ya representado por otro candidato de la misma Source.',
  '51': 'Navegación sin conocimiento sobre Marilyn Diptych; identidad duplicada pendiente por separado.',
  '57': 'Arquitectura de Santo Tomé, no características de la pintura.',
  '58': 'Arquitectura de la torre de Santo Tomé, no características de la pintura.',
  '59': 'Decoración arquitectónica de Santo Tomé, no características de la pintura.',
};
const wrongTargetRejects = new Set([
  '32',
  '34',
  '36',
  '38',
  '40',
  '42',
  '44',
  '50',
  '57',
  '58',
  '59',
]);
const wrongTargetDefers = new Set(['03', '12', '23', '25', '52', '53', '54', '55', '56', '60']);
const potentialTargets: Record<string, string> = {
  '03': 'Guernica',
  '12': 'Guernica / Cubismo',
  '23': 'Pablo Picasso',
  '25': 'Cubismo analítico',
  '52': 'Iglesia de Santo Tomé',
  '53': 'Don Gonzalo Ruiz de Toledo',
  '54': 'Don Gonzalo Ruiz de Toledo',
  '55': 'Milagro del entierro del señor de Orgaz',
  '56': 'Iglesia de Santo Tomé',
  '60': 'Iglesia de Santo Tomé',
};

const slot = (id: string) => id.slice(-2);
const decisionFor = (id: string) =>
  approve.has(id) ? 'APPROVE' : reject.has(id) ? 'REJECT' : defer.has(id) ? 'DEFER' : null;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL_REQUIRED');
  const parsed = new URL(dbUrl);
  if (
    !['localhost', '127.0.0.1', 'db', '::1'].includes(parsed.hostname) ||
    parsed.pathname.slice(1) !== 'jano'
  )
    throw new Error('DATABASE_SAFETY_BLOCK');

  const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
  const ids = packet.items.map((item: any) => item.reviewItemId);
  if (ids.length !== 60 || new Set(ids).size !== 60)
    throw new Error('REVIEW_PACKET_RECONCILIATION_FAILED');
  if (
    [...approve, ...reject, ...defer].length !== 60 ||
    new Set([...approve, ...reject, ...defer]).size !== 60
  )
    throw new Error('HUMAN_DECISION_RECONCILIATION_FAILED');

  const confirmedAt = '2026-08-31T00:00:00.000Z';
  const decisions = packet.items.map((item: any) => {
    const id = slot(item.reviewItemId);
    const humanDecision = decisionFor(id);
    return {
      batchId: packet.batchId,
      reviewItemId: item.reviewItemId,
      humanDecision,
      humanReason:
        humanDecision === 'APPROVE'
          ? approved[id].reason
          : humanDecision === 'REJECT'
            ? rejectReasons[id]
            : `Acciones pendientes: ${actions[id].join(', ')}.`,
      decisionConfirmedAt: confirmedAt,
      decisionSource: 'USER_CONFIRMED_REVIEW',
    };
  });
  writeFileSync(
    decisionsPath,
    JSON.stringify({ batchId: packet.batchId, items: decisions }, null, 2) + '\n',
  );
  writeFileSync(
    deferPath,
    JSON.stringify(
      {
        batchId: packet.batchId,
        items: packet.items
          .filter((item: any) => defer.has(slot(item.reviewItemId)))
          .map((item: any) => ({
            entity: item.entity,
            reviewItemId: item.reviewItemId,
            deferActions: actions[slot(item.reviewItemId)],
            why: `Requiere ${actions[slot(item.reviewItemId)].join(', ')} antes de volver a validarse.`,
            potentialTarget: potentialTargets[slot(item.reviewItemId)] ?? null,
            originalProposition: item.rawModelProposition,
            status: 'PENDING',
          })),
      },
      null,
      2,
    ) + '\n',
  );

  const prisma = new PrismaService();
  const service = new ReviewedResearchEvidenceService(prisma);
  const evidenceResults: any[] = [];
  for (const item of packet.items.filter((entry: any) => approve.has(slot(entry.reviewItemId)))) {
    const id = slot(item.reviewItemId);
    const human = approved[id];
    const result = await service.materialize({
      projectId,
      sourceId: item.provenance.sourceId,
      excerptId: item.provenance.excerptId,
      canonicalEntityId: item.entity.id,
      supportQuote: item.supportQuote,
      proposition: human.proposition,
      dimension: human.dimension,
      reviewItemId: item.reviewItemId,
      role: item.role,
      decisionSource: 'USER_CONFIRMED_REVIEW',
      originalProposition: item.validatedProposition,
      originalDimension: item.normalizedDimension ?? item.rawDimension,
    });
    evidenceResults.push({ item, human, ...result });
  }
  const cezanne = await prisma.entity.findFirst({
    where: { title: 'Paul Cézanne' },
    select: { id: true, title: true },
  });
  const influencedBy = await prisma.relationType.findUnique({
    where: { key: 'INFLUENCED_BY' },
    select: { id: true, key: true },
  });
  const promotionItems = evidenceResults.map(({ item, human, evidenceId }) => ({
    reviewItemId: item.reviewItemId,
    researchEvidenceId: evidenceId,
    canonicalEntityId: item.entity.id,
    canonicalEntityTitle: item.entity.title,
    humanApprovedProposition: human.proposition,
    supportQuote: item.supportQuote,
    finalDimension: human.dimension,
    provenance: item.provenance,
    knowledgeStatus: human.knowledgeStatus,
    promotionTarget: human.promotionTarget ?? 'ENTITY_KNOWLEDGE',
    proposedAction:
      human.promotionTarget === 'RELATION_PROPOSAL'
        ? 'REVIEW_RELATION'
        : human.knowledgeStatus === 'ADDITIONAL_PROVENANCE'
          ? 'ADD_PROVENANCE'
          : 'CREATE_CANONICAL_KNOWLEDGE',
    relationProposal:
      human.promotionTarget === 'RELATION_PROPOSAL'
        ? {
            sourceEntity: item.entity,
            targetEntity: cezanne,
            candidatePredicate: influencedBy,
            humanReviewRequired: true,
            apply: false,
          }
        : null,
    apply: false,
  }));
  writeFileSync(
    planPath,
    JSON.stringify(
      {
        batchId: packet.batchId,
        apply: false,
        items: promotionItems,
        affectedEntities: [
          ...new Map(
            promotionItems.map((item) => [
              item.canonicalEntityId,
              { id: item.canonicalEntityId, title: item.canonicalEntityTitle },
            ]),
          ).values(),
        ],
        knowledgeCoreMutated: false,
        canonicalRelationsCreated: 0,
      },
      null,
      2,
    ) + '\n',
  );

  const outcomes: Record<string, Record<string, number>> = {};
  for (const item of packet.items) {
    const composition =
      item.compositionSource === 'SEMANTIC_DECISION' ? item.reviewKind : item.compositionSource;
    outcomes[composition] ??= { APPROVE: 0, REJECT: 0, DEFER: 0 };
    outcomes[composition][decisionFor(slot(item.reviewItemId))!]++;
  }
  const clean = packet.items.filter((item: any) => item.promotionReady);
  const cleanOutcomes = {
    APPROVE: clean.filter((item: any) => approve.has(slot(item.reviewItemId))).length,
    REJECT: clean.filter((item: any) => reject.has(slot(item.reviewItemId))).length,
    DEFER: clean.filter((item: any) => defer.has(slot(item.reviewItemId))).length,
  };
  console.log(
    JSON.stringify(
      {
        decisions: { APPROVE: approve.size, REJECT: reject.size, DEFER: defer.size },
        researchEvidence: {
          created: evidenceResults.filter((result) => result.created).length,
          reused: evidenceResults.filter((result) => !result.created).length,
        },
        outcomes,
        cleanOutcomes,
        wrongTarget: { rejects: wrongTargetRejects.size, defers: wrongTargetDefers.size },
        promotionItems: promotionItems.length,
        affectedEntities: new Set(promotionItems.map((item) => item.canonicalEntityId)).size,
      },
      null,
      2,
    ),
  );
  await prisma.onModuleDestroy();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
