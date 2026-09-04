import { readFileSync, writeFileSync } from 'node:fs';
import { DeterministicSemanticEvidenceClassifier } from '../src/research/semantic-evidence-classifier';
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const report: any = JSON.parse(
  readFileSync(`${root}/artifacts/controlled-source-ingestion-pilot3.json`, 'utf8'),
);
const classifier = new DeterministicSemanticEvidenceClassifier();
async function main() {
  const rows: any[] = [];
  for (const result of report.results)
    for (const excerpt of result.excerptCandidates ?? [])
      rows.push({
        source: result.source,
        sourcePurpose: result.purpose,
        excerpt,
        prediction: await classifier.classify({
          excerpt: excerpt.text,
          sourcePurpose: result.purpose,
          source: { id: result.source.id, title: result.source.title, locator: excerpt.locator },
          candidateEntity: {
            id: excerpt.primaryEntity ?? result.source.id,
            canonicalName: excerpt.primaryEntity ?? result.source.title,
            type: 'UNKNOWN',
          },
        }),
      });
  const out = {
    classifierFreeze: '5b3ff0f17820823fbea4a60a2df2492e46951cbe0e8ed1fd089b3cb1ec32fa88',
    projectId: report.projectId,
    total: rows.length,
    rows,
    note: 'Blind predictions captured before independent gold review; no rule changes after inspection.',
  };
  writeFileSync(
    `${root}/artifacts/semantic-evidence-pilot3-predictions.json`,
    JSON.stringify(out, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        predictions: Object.fromEntries(
          ['KEEP', 'REVIEW', 'REJECT'].map((d) => [
            d,
            rows.filter((r) => r.prediction.decision === d).length,
          ]),
        ),
      },
      null,
      2,
    ),
  );
}
void main();
