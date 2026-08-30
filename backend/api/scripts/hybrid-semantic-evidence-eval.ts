import { readFileSync, writeFileSync } from 'node:fs';
import {
  DeterministicSemanticEvidenceClassifier,
  type EvidenceDecision,
} from '../src/research/semantic-evidence-classifier';
import { HybridSemanticEvidenceClassifier } from '../src/research/hybrid-semantic-evidence-classifier';
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const read = (p: string) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
async function main() {
  const sources = [
    read('artifacts/controlled-source-ingestion-pilot-final.json'),
    read('artifacts/controlled-source-ingestion-pilot2.json'),
  ];
  const rows: any[] = [];
  for (const [i, a] of sources.entries())
    for (const r of a.results)
      for (const [index, e] of (r.excerptCandidates ?? []).entries())
        rows.push({
          key: `${r.source.title}::${e.text}`,
          pilot: i === 0 ? 'PILOT_1' : 'PILOT_2',
          source: r.source.title,
          sourcePurpose: r.purpose,
          entity: e.primaryEntity,
          text: e.text,
          gold: require('../src/research/semantic-evidence-gold').goldLabel(
            i === 0 ? 'PILOT_1' : 'PILOT_2',
            r.source.title,
            index,
            e.text,
          ),
        });
  for (const file of [
    'artifacts/semantic-evidence-pilot3-gold-eval.json',
    'artifacts/semantic-evidence-pilot4-gold-eval.json',
  ]) {
    const a = read(file);
    for (const r of a.rows)
      rows.push({
        key: `${r.source.title}::${r.excerpt.text}`,
        pilot: file.includes('pilot3') ? 'PILOT_3' : 'PILOT_4',
        source: r.source.title,
        sourcePurpose: r.sourcePurpose,
        entity: r.excerpt.primaryEntity,
        text: r.excerpt.text,
        gold: {
          decision: r.gold.decision,
          role: r.gold.role,
          proposition: r.gold.proposition,
          dimension: r.gold.dimension,
        },
      });
  }
  const unique = [...new Map(rows.map((r) => [r.key, r])).values()];
  const classifier = new HybridSemanticEvidenceClassifier();
  const predictions: any[] = [];
  for (const r of unique)
    predictions.push({
      ...r,
      prediction: await classifier.classify(
        {
          excerpt: r.text,
          sourcePurpose: r.sourcePurpose,
          source: { title: r.source },
          candidateEntity: {
            id: r.entity ?? r.source,
            canonicalName: r.entity ?? r.source,
            type: 'UNKNOWN',
          },
        },
        'DETERMINISTIC_ONLY',
      ),
    });
  const ds: EvidenceDecision[] = ['KEEP', 'REVIEW', 'REJECT'];
  const matrix = Object.fromEntries(
    ds.map((p) => [
      p,
      Object.fromEntries(
        ds.map((g) => [
          g,
          predictions.filter((r) => r.prediction.decision === p && r.gold.decision === g).length,
        ]),
      ),
    ]),
  );
  const pk = predictions.filter((r) => r.prediction.decision === 'KEEP').length,
    tk = predictions.filter(
      (r) => r.prediction.decision === 'KEEP' && r.gold.decision === 'KEEP',
    ).length,
    gk = predictions.filter((r) => r.gold.decision === 'KEEP').length;
  const result = {
    corpus: {
      total: predictions.length,
      sourcePurposes: Object.fromEntries(
        [...new Set(predictions.map((r) => r.sourcePurpose))].map((p) => [
          p,
          predictions.filter((r) => r.sourcePurpose === p).length,
        ]),
      ),
      gold: Object.fromEntries(
        ds.map((d) => [d, predictions.filter((r) => r.gold.decision === d).length]),
      ),
    },
    deterministic: {
      keepPrecision: pk ? tk / pk : null,
      keepRecall: tk / gk,
      reviewRate:
        predictions.filter((r) => r.prediction.decision === 'REVIEW').length / predictions.length,
      rejectRate:
        predictions.filter((r) => r.prediction.decision === 'REJECT').length / predictions.length,
      falseKeep: predictions.filter(
        (r) => r.prediction.decision === 'KEEP' && r.gold.decision !== 'KEEP',
      ).length,
      falseReject: predictions.filter(
        (r) => r.prediction.decision === 'REJECT' && r.gold.decision === 'KEEP',
      ).length,
      overallAgreement:
        predictions.filter((r) => r.prediction.decision === r.gold.decision).length /
        predictions.length,
      confusionMatrix: matrix,
    },
    semanticRuntime: {
      status:
        process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'noop'
          ? 'AVAILABLE_NOT_EXECUTED'
          : 'SEMANTIC_RUNTIME_NOT_TESTED',
      provider: process.env.AI_PROVIDER ?? 'noop',
      model: process.env.AI_MODEL ?? process.env.OLLAMA_MODEL ?? 'unavailable',
      reason: 'No model was executed; semantic metrics are intentionally absent.',
    },
    hybrid: {
      status: 'NOT_EXECUTED',
      note: 'Hybrid will use the same deterministic hard gates plus provider output once a controlled runtime is explicitly enabled.',
    },
    rows: predictions,
  };
  writeFileSync(
    `${root}/artifacts/hybrid-semantic-evidence-eval.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        corpus: result.corpus,
        deterministic: result.deterministic,
        semanticRuntime: result.semanticRuntime,
      },
      null,
      2,
    ),
  );
}
void main();
