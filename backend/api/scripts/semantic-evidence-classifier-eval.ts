import { readFileSync } from 'node:fs';
import {
  DeterministicSemanticEvidenceClassifier,
  type EvidenceDecision,
} from '../src/research/semantic-evidence-classifier';
import { goldLabel } from '../src/research/semantic-evidence-gold';

const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as any;
const evaluate = async (path: string, pilot: 'PILOT_1' | 'PILOT_2') => {
  const report = load(path);
  const items = report.results.flatMap((result: any) =>
    result.excerptCandidates.map((excerpt: any, index: number) => ({ result, excerpt, index })),
  );
  const classifier = new DeterministicSemanticEvidenceClassifier();
  const rows = [] as any[];
  for (const item of items) {
    const entity = item.excerpt.primaryEntity ?? 'Unknown';
    const gold = goldLabel(pilot, item.result.source.title, item.index, item.excerpt.text);
    const prediction = await classifier.classify({
      excerpt: item.excerpt.text,
      sourcePurpose: item.result.purpose,
      source: {
        id: item.result.source.id,
        title: item.result.source.title,
        locator: item.excerpt.locator,
      },
      candidateEntity: { id: entity, canonicalName: entity, type: 'UNKNOWN' },
    });
    rows.push({
      pilot,
      source: item.result.source.title,
      excerpt: item.excerpt.text,
      entity,
      prediction,
      gold,
      error:
        prediction.decision === gold.decision
          ? null
          : prediction.decision === 'KEEP'
            ? 'FALSE_KEEP'
            : prediction.decision === 'REJECT'
              ? 'FALSE_REJECT'
              : 'UNNECESSARY_REVIEW',
    });
  }
  const counts = (decision: EvidenceDecision, key: 'prediction' | 'gold') =>
    rows.filter((row) => row[key].decision === decision).length;
  const matrix = Object.fromEntries(
    (['KEEP', 'REVIEW', 'REJECT'] as EvidenceDecision[]).map((prediction) => [
      prediction,
      Object.fromEntries(
        (['KEEP', 'REVIEW', 'REJECT'] as EvidenceDecision[]).map((gold) => [
          gold,
          rows.filter((row) => row.prediction.decision === prediction && row.gold.decision === gold)
            .length,
        ]),
      ),
    ]),
  );
  const predictedKeep = counts('KEEP', 'prediction');
  const goldKeep = counts('KEEP', 'gold');
  const trueKeep = rows.filter(
    (row) => row.prediction.decision === 'KEEP' && row.gold.decision === 'KEEP',
  ).length;
  return {
    pilot,
    total: rows.length,
    predictions: {
      KEEP: counts('KEEP', 'prediction'),
      REVIEW: counts('REVIEW', 'prediction'),
      REJECT: counts('REJECT', 'prediction'),
    },
    gold: {
      KEEP: counts('KEEP', 'gold'),
      REVIEW: counts('REVIEW', 'gold'),
      REJECT: counts('REJECT', 'gold'),
    },
    metrics: {
      acceptanceRate: predictedKeep / Math.max(1, rows.length),
      classifierPrecision: trueKeep / Math.max(1, predictedKeep),
      classifierRecall: trueKeep / Math.max(1, goldKeep),
      reviewRate: counts('REVIEW', 'prediction') / Math.max(1, rows.length),
      rejectRate: counts('REJECT', 'prediction') / Math.max(1, rows.length),
      overallAgreement: rows.filter((row) => !row.error).length / Math.max(1, rows.length),
    },
    confusionMatrix: matrix,
    errors: rows.filter((row) => row.error),
    rows,
  };
};

async function main() {
  const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
  const pilot1 = await evaluate(
    `${root}/artifacts/controlled-source-ingestion-pilot-final.json`,
    'PILOT_1',
  );
  const pilot2 = await evaluate(
    `${root}/artifacts/controlled-source-ingestion-pilot2.json`,
    'PILOT_2',
  );
  const combinedRows = [...pilot1.rows, ...pilot2.rows];
  const combinedTrueKeep = combinedRows.filter(
    (row) => row.prediction.decision === 'KEEP' && row.gold.decision === 'KEEP',
  ).length;
  const combinedPredKeep = combinedRows.filter((row) => row.prediction.decision === 'KEEP').length;
  const combinedGoldKeep = combinedRows.filter((row) => row.gold.decision === 'KEEP').length;
  console.log(
    JSON.stringify(
      {
        pilot1,
        pilot2,
        combined: {
          total: combinedRows.length,
          classifierPrecision: combinedTrueKeep / Math.max(1, combinedPredKeep),
          classifierRecall: combinedTrueKeep / Math.max(1, combinedGoldKeep),
          reviewRate:
            combinedRows.filter((row) => row.prediction.decision === 'REVIEW').length /
            combinedRows.length,
          confusionMatrix: Object.fromEntries(
            (['KEEP', 'REVIEW', 'REJECT'] as EvidenceDecision[]).map((prediction) => [
              prediction,
              Object.fromEntries(
                (['KEEP', 'REVIEW', 'REJECT'] as EvidenceDecision[]).map((gold) => [
                  gold,
                  combinedRows.filter(
                    (row) => row.prediction.decision === prediction && row.gold.decision === gold,
                  ).length,
                ]),
              ),
            ]),
          ),
        },
        rolloutReadiness: {
          previous: 63,
          current: 63,
          reason:
            'Implementation exists, but Pilot 1/Pilot 2 gold evaluation does not yet meet Stage 1 confidence; no automatic score increase.',
          currentStage: 'STAGE_0_EXPERIMENTAL',
          nextStage: 'STAGE_1_SMALL_BATCH_READY',
          distanceToStage1: 'KEEP precision and review workflow remain below exit criteria',
          majorStepsRemaining: 3,
          validationBatchesRemaining: 1,
          criticalBlockersOpen: [
            'B-01 semantic evidence precision',
            'B-02 operational human review',
          ],
          newBlockers: [],
          closedBlockers: [],
          knowledgeCoverage: 'Unchanged; pipeline readiness is separate from entity depth.',
        },
        note: 'Deterministic evaluation over frozen Pilot 1/Pilot 2 artifacts. No LLM, no new Sources, no writes.',
      },
      null,
      2,
    ),
  );
}
if (require.main === module) void main();
