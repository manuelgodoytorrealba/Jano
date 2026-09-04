import { readFileSync } from 'node:fs';
import {
  DeterministicSemanticEvidenceClassifier,
  type EvidenceDecision,
} from '../src/research/semantic-evidence-classifier';

type Item = {
  pilot: 'PILOT_1' | 'PILOT_2';
  source: string;
  index: number;
  gold: EvidenceDecision;
  role: string;
  proposition: string | null;
  dimension: string | null;
  rationale: string;
};
const selected: Item[] = [
  {
    pilot: 'PILOT_1',
    source: 'Pablo Picasso',
    index: 0,
    gold: 'KEEP',
    role: 'PRIMARY_SUBJECT',
    proposition: null,
    dimension: 'biography',
    rationale: 'Dedicated documentary paragraph.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Pablo Picasso',
    index: 2,
    gold: 'KEEP',
    role: 'PRIMARY_SUBJECT',
    proposition: null,
    dimension: 'development',
    rationale: 'Dedicated documentary paragraph.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Marcel Duchamp: Fountain',
    index: 0,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Institutional collection/navigation text.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Marcel Duchamp: Fountain',
    index: 1,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Institutional navigation text.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Cubism',
    index: 0,
    gold: 'KEEP',
    role: 'PRIMARY_SUBJECT',
    proposition: null,
    dimension: 'characteristics',
    rationale: 'Documentary movement description.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Art & Architecture Thesaurus',
    index: 0,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Taxonomy/reference navigation without a bounded claim.',
  },
  {
    pilot: 'PILOT_2',
    source: 'The body in art',
    index: 0,
    gold: 'KEEP',
    role: 'PRIMARY_SUBJECT',
    proposition: null,
    dimension: 'definition',
    rationale: 'Explicit concept definition.',
  },
  {
    pilot: 'PILOT_2',
    source: 'The Bayeux Tapestry',
    index: 2,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Visitor logistics and legal footer.',
  },
  {
    pilot: 'PILOT_2',
    source: 'Louise Bourgeois overview',
    index: 0,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Exhibition promotion/listing.',
  },
  {
    pilot: 'PILOT_1',
    source: 'Madrid Destino',
    index: 0,
    gold: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Tourism/marketing listing.',
  },
];
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const files = {
  PILOT_1: `${root}/artifacts/controlled-source-ingestion-pilot-final.json`,
  PILOT_2: `${root}/artifacts/controlled-source-ingestion-pilot2.json`,
};
const reports: Record<string, any> = {
  PILOT_1: JSON.parse(readFileSync(files.PILOT_1, 'utf8')),
  PILOT_2: JSON.parse(readFileSync(files.PILOT_2, 'utf8')),
};
async function main() {
  const classifier = new DeterministicSemanticEvidenceClassifier();
  const rows: any[] = [];
  for (const item of selected) {
    const result = reports[item.pilot].results.find((r: any) => r.source.title === item.source);
    const excerpt = result.excerptCandidates[item.index];
    const prediction = await classifier.classify({
      excerpt: excerpt.text,
      sourcePurpose: result.purpose,
      source: { id: result.source.id, title: item.source, locator: excerpt.locator },
      candidateEntity: {
        id: excerpt.primaryEntity,
        canonicalName: excerpt.primaryEntity,
        type: 'UNKNOWN',
      },
    });
    rows.push({ item, excerpt: excerpt.text, prediction });
  }
  const decisions: EvidenceDecision[] = ['KEEP', 'REVIEW', 'REJECT'];
  const matrix = Object.fromEntries(
    decisions.map((p) => [
      p,
      Object.fromEntries(
        decisions.map((g) => [
          g,
          rows.filter((r) => r.prediction.decision === p && r.item.gold === g).length,
        ]),
      ),
    ]),
  );
  const predictedKeep = rows.filter((r) => r.prediction.decision === 'KEEP').length;
  const trueKeep = rows.filter(
    (r) => r.prediction.decision === 'KEEP' && r.item.gold === 'KEEP',
  ).length;
  const goldKeep = rows.filter((r) => r.item.gold === 'KEEP').length;
  console.log(
    JSON.stringify(
      {
        dataset: 'post-freeze exploratory holdout',
        total: rows.length,
        predictions: Object.fromEntries(
          decisions.map((d) => [d, rows.filter((r) => r.prediction.decision === d).length]),
        ),
        metrics: {
          classifierPrecision: trueKeep / Math.max(1, predictedKeep),
          classifierRecall: trueKeep / goldKeep,
          reviewRate: rows.filter((r) => r.prediction.decision === 'REVIEW').length / rows.length,
          rejectRate: rows.filter((r) => r.prediction.decision === 'REJECT').length / rows.length,
          falseKeep: rows.filter((r) => r.prediction.decision === 'KEEP' && r.item.gold !== 'KEEP')
            .length,
          falseReject: rows.filter(
            (r) => r.prediction.decision === 'REJECT' && r.item.gold === 'KEEP',
          ).length,
        },
        confusionMatrix: matrix,
        rows,
      },
      null,
      2,
    ),
  );
}
void main();
