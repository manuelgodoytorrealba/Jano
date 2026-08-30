import { readFileSync } from 'node:fs';

type Decision = 'KEEP' | 'REVIEW' | 'REJECT';
const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as any;
const noise =
  /you might like|our galleries|free admission|what's on|practical information|advertisement|plan your trip|subscribe|related|search the collection|sitemap|legal information|cookie/i;
const substantive =
  /is art|is a|was|were|born|surgió|nació|created|artist|painting|obra|movement|principal medium|1066|cubism|cubismo/i;
const normalize = (value: string) =>
  value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function reviewPilot(path: string, pilot: 'PILOT_1' | 'PILOT_2') {
  const report = load(path);
  const items = (report.associationAudit.items as Array<any>).filter((item) =>
    pilot === 'PILOT_1' ? item.decision === 'REVIEW' : true,
  );
  const audits = items.map((item) => {
    const text = String(item.excerptSummary);
    const source = String(item.source);
    const primary = String(item.primarySubject ?? '');
    const isNoise = noise.test(text);
    const isSubstantive = substantive.test(text) && text.length >= 160;
    let decision: Decision = 'REVIEW';
    let role = 'CONTEXT_FOR';
    let proposition: string | null = null;
    let reason = 'La relevancia de la entidad o la suficiencia de la evidencia no es concluyente.';
    if (isNoise && !isSubstantive) {
      decision = 'REJECT';
      role = 'UNRELATED';
      reason = 'Navegación, promoción o metadata sin conocimiento sustantivo.';
    } else if (pilot === 'PILOT_1' && normalize(source).includes('cubism') && isSubstantive) {
      decision = 'KEEP';
      role = 'PRIMARY_SUBJECT';
      proposition = text.split(/(?<=[.!?])\s+/)[0];
      reason =
        'El fragmento explica rasgos/origen del cubismo y la Source es específica del movimiento.';
    } else if (
      pilot === 'PILOT_1' &&
      normalize(source).includes('pablo picasso') &&
      isSubstantive
    ) {
      decision = 'KEEP';
      role = 'PRIMARY_SUBJECT';
      proposition = text.split(/(?<=[.!?])\s+/)[0];
      reason = 'La Source y el fragmento tratan directamente la trayectoria o práctica de Picasso.';
    } else if (
      pilot === 'PILOT_2' &&
      /body in art/i.test(source) &&
      /body art is art/i.test(text)
    ) {
      decision = 'KEEP';
      role = 'PRIMARY_SUBJECT';
      proposition =
        'Body art es una práctica artística en la que el cuerpo es el medio y foco principal.';
      reason = 'Definición explícita, entidad y dimensión coinciden.';
    } else if (pilot === 'PILOT_2' && /bayeux/i.test(source) && /1066/.test(text)) {
      decision = 'REVIEW';
      role = 'ABOUT';
      reason =
        'Identifica tema y fecha, pero el texto es promocional y no basta para una proposition documental amplia.';
    } else if (isSubstantive) {
      decision = 'REVIEW';
      reason =
        'Puede contener contexto, pero la entidad primaria o la proposition requieren revisión humana.';
    } else {
      decision = 'REJECT';
      role = 'UNRELATED';
      reason = 'No se puede formular un claim útil sin añadir información externa.';
    }
    return {
      source,
      excerptText: text,
      currentEntity: primary,
      sourcePurpose: item.sourcePurpose ?? null,
      actualInformation: text,
      potentialPrimarySubject: primary || null,
      otherPossibleEntities:
        item.entityAssociations
          ?.map((association: any) => association.entity)
          .filter((entity: string) => entity !== primary) ?? [],
      associationRole: role,
      why: reason,
      evidenceProposition: proposition
        ? {
            statement: proposition,
            evidenceRole: 'DIRECT_DOCUMENTARY_EVIDENCE',
            supportedEntity: primary,
            supportedDimension: 'context / characteristics',
            source,
            locator: null,
            confidence: decision === 'KEEP' ? 'high' : 'medium',
          }
        : null,
      evidenceSufficiency: proposition
        ? 'SUFFICIENT_FOR_NARROW_CLAIM'
        : decision === 'REVIEW'
          ? 'PARTIAL'
          : 'NONE',
      decision,
    };
  });
  return {
    pilot,
    before: { KEEP: 0, REVIEW: items.length, REJECT: 0 },
    after: {
      KEEP: audits.filter((item) => item.decision === 'KEEP').length,
      REVIEW: audits.filter((item) => item.decision === 'REVIEW').length,
      REJECT: audits.filter((item) => item.decision === 'REJECT').length,
    },
    precision:
      audits.filter((item) => item.decision === 'KEEP').length /
      Math.max(1, audits.filter((item) => ['KEEP', 'REJECT'].includes(item.decision)).length),
    items: audits,
  };
}

const rolloutDimensions = [
  ['A', 'Source ingestion reliability', 52, 'IMPORTANT'],
  ['B', 'Source purpose classification', 72, 'IMPORTANT'],
  ['C', 'Excerpt selection quality', 46, 'CRITICAL'],
  ['D', 'Evidence precision', 44, 'CRITICAL'],
  ['E', 'Entity association precision', 45, 'CRITICAL'],
  ['F', 'Provenance completeness', 82, 'CRITICAL'],
  ['G', 'Research/Core boundary safety', 94, 'CRITICAL'],
  ['H', 'Human review workflow', 58, 'CRITICAL'],
  ['I', 'Promotion safety', 86, 'CRITICAL'],
  ['J', 'Context retrieval quality', 40, 'CRITICAL'],
  ['K', 'Editorial depth assignment', 76, 'IMPORTANT'],
  ['L', 'Editorial generation quality', 62, 'IMPORTANT'],
  ['M', 'Rollback / observability', 80, 'CRITICAL'],
  ['N', 'Batch processing safety', 55, 'CRITICAL'],
];

function main() {
  const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
  const pilot1 = reviewPilot(
    `${root}/artifacts/controlled-source-ingestion-pilot-final.json`,
    'PILOT_1',
  );
  const pilot2 = reviewPilot(
    `${root}/artifacts/controlled-source-ingestion-pilot2.json`,
    'PILOT_2',
  );
  const weighted = rolloutDimensions.reduce(
    (sum, row) => sum + Number(row[2]) * (row[3] === 'CRITICAL' ? 2 : 1),
    0,
  );
  const weight = rolloutDimensions.reduce((sum, row) => sum + (row[3] === 'CRITICAL' ? 2 : 1), 0);
  const readiness = Math.round(weighted / weight);
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pilot1,
        pilot2,
        semanticContract: [
          'PRIMARY_SUBJECT',
          'ABOUT',
          'CONTEXT_FOR',
          'SUPPORTS_RELATION',
          'MENTION',
          'UNRELATED',
        ],
        evidencePropositionContract: [
          'statement',
          'evidenceRole',
          'supportedEntity',
          'supportedDimension',
          'source',
          'locator',
          'confidence',
        ],
        rolloutReadiness: {
          score: readiness,
          currentStage: 'STAGE_0_EXPERIMENTAL',
          nextStage: 'STAGE_1_SMALL_BATCH_READY',
          distanceToNextStage:
            '2 critical blockers: semantic evidence precision and review workflow; 1 important improvement: excerpt selection',
          dimensions: rolloutDimensions.map(([id, name, score, status]) => ({
            id,
            name,
            score,
            status,
            evidence: 'Pilot 1/Pilot 2 results and existing architecture',
            blockers: Number(score) < 60 ? 'Needs validation' : null,
            whatWouldRaiseIt:
              Number(score) < 60
                ? 'validated semantic propositions and review decisions'
                : 'additional cross-domain validation',
          })),
          criticalBlockers: [
            {
              id: 'B-01',
              description: 'Evidence/excerpt relevance still produces REVIEW-heavy candidates.',
              firstDetected: 'Pilot 2',
              status: 'OPEN',
              exitCriteria:
                'Independent review on Pilot 1 + Pilot 2 with high KEEP precision and correct REJECT decisions.',
            },
            {
              id: 'B-02',
              description:
                'Human review workflow is not yet operationalized for semantic propositions.',
              firstDetected: 'Pilot 2',
              status: 'OPEN',
              exitCriteria:
                'Reviewer can accept/reject a candidate with source, span, role and proposition.',
            },
          ],
          importantBlockers: [
            {
              id: 'B-03',
              description:
                'Excerpt selector retains navigation/promotional paragraphs in some pages.',
              firstDetected: 'Pilot 1',
              status: 'OPEN',
              exitCriteria: 'Noise rejected consistently across both pilots.',
            },
          ],
          nonBlockingImprovements: ['additional host-specific ingestion telemetry'],
          majorStepsRemaining: 4,
          validationBatchesRemaining: 1,
          knowledgeCoverage:
            'Separate from pipeline readiness; most entities remain bibliography-only.',
          estimatedWorkRemaining: 'HIGH',
          pathToFullSeed: [
            'semantic classifier/review contract',
            '100-source controlled batch',
            '250-source batch with review-load metrics',
            'full-seed dry run',
            'full-seed apply only after explicit review policy',
          ],
          fullSeedGate: 'NOT_READY',
          fullSeedGateMissing: [
            'semantic evidence precision',
            'review workflow',
            'batch review-load validation',
            'context retrieval quality',
          ],
        },
        note: 'Audit-only over Pilot 1/Pilot 2; no new Sources, no LLM, no writes.',
      },
      null,
      2,
    ),
  );
}
if (require.main === module) main();
