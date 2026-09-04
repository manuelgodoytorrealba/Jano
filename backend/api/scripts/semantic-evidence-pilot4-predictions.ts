import { readFileSync, writeFileSync } from 'node:fs';
import { DeterministicSemanticEvidenceClassifier } from '../src/research/semantic-evidence-classifier';
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const report: any = JSON.parse(
  readFileSync(`${root}/artifacts/controlled-source-ingestion-pilot4.json`, 'utf8'),
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
    classifierFreeze: 'e4fc02a9cdf061a6f91b5b7a7390e79c6d572c2b341e28704f2bf32e5df36e15',
    projectId: report.projectId,
    total: rows.length,
    rows,
    note: 'Blind predictions captured before independent gold review; rules frozen.',
  };
  writeFileSync(
    `${root}/artifacts/semantic-evidence-pilot4-predictions.json`,
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
