import { readFileSync, writeFileSync } from 'node:fs';
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const predictions: any = JSON.parse(
  readFileSync(`${root}/artifacts/semantic-evidence-pilot3-predictions.json`, 'utf8'),
);
// Independent review performed after the blind pass; labels judge the excerpt, not the prediction.
const gold: any[] = [
  [
    'El entierro del señor de Orgaz',
    0,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Church navigation and visitor information.',
  ],
  [
    'El entierro del señor de Orgaz',
    1,
    'CONTEXT_FOR',
    'CONTEXT_FOR',
    null,
    'architectural context',
    'Describes the church building, not the painting; potentially useful context.',
  ],
  [
    'El entierro del señor de Orgaz',
    2,
    'CONTEXT_FOR',
    'CONTEXT_FOR',
    null,
    'historical context',
    'Biographical context about the person who commissioned/supported the church.',
  ],
  [
    'El entierro del señor de Orgaz',
    3,
    'CONTEXT_FOR',
    'CONTEXT_FOR',
    null,
    'historical context',
    'Testament and donations contextualise the church setting, not the artwork directly.',
  ],
  [
    '1000 Years of Joys and Sorrows — Sunflower Seeds',
    0,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Book marketing and author endorsement.',
  ],
  [
    '1000 Years of Joys and Sorrows — Sunflower Seeds',
    1,
    'REVIEW',
    'CONTEXT_FOR',
    null,
    'historical context',
    'Documentary biographical context about Ai Qing and Cultural Revolution, but not directly about the artwork.',
  ],
  [
    '1000 Years of Joys and Sorrows — Sunflower Seeds',
    2,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Book promotion/call to action.',
  ],
  [
    '1000 Years of Joys and Sorrows — Sunflower Seeds',
    3,
    'KEEP',
    'CONTEXT_FOR',
    'In Mao’s China, sunflowers also had a special, symbolic status.',
    'cultural context',
    'The artist statement supplies a concrete symbolic context that can support a bounded claim about the work, without asserting how the work was interpreted.',
  ],
  [
    'Cy Twombly — registro de autoridad',
    0,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Authority-page aliases and labels, no bounded claim.',
  ],
  [
    'Cy Twombly — registro de autoridad',
    1,
    'REVIEW',
    'ABOUT',
    null,
    'identity / provenance',
    'Structured biographical facts are potentially useful but mixed with many references and no clean span.',
  ],
  [
    'Cy Twombly — registro de autoridad',
    2,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Long authority/reference list without a bounded editorial proposition.',
  ],
  [
    'Cy Twombly — registro de autoridad',
    3,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Structured authority metadata and inferred references; not editorial evidence.',
  ],
  [
    'Dan Flavin — registro de autoridad',
    0,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Authority metadata.',
  ],
  [
    'Dan Flavin — registro de autoridad',
    1,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Reference list and collection identifiers.',
  ],
  [
    'Dan Flavin — registro de autoridad',
    2,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Authority/reference metadata without a bounded claim.',
  ],
];
const labels = new Map(
  gold.map((g) => [
    `${g[0]}::${g[1]}`,
    { decision: g[2], role: g[3], proposition: g[4], dimension: g[5], rationale: g[6] },
  ]),
);
const rows = predictions.rows.map((r: any) => ({
  ...r,
  gold:
    labels.get(`${r.source.title}::${r.excerpt.locator?.replace('paragraph-', '') - 1}`) ?? null,
}));
// Prefer stable row order/source+index because locator is paragraph-N.
for (const r of rows) {
  const key = `${r.source.title}::${r.excerpt.locator?.replace('paragraph-', '') - 1}`;
  r.gold = labels.get(key) ?? labels.get(`${r.source.title}::${predictions.rows.indexOf(r)}`);
}
const ds = ['KEEP', 'REVIEW', 'REJECT'];
const matrix = Object.fromEntries(
  ds.map((p) => [
    p,
    Object.fromEntries(
      ds.map((g) => [
        g,
        rows.filter((r: any) => r.prediction.decision === p && r.gold?.decision === g).length,
      ]),
    ),
  ]),
);
const pk = rows.filter((r: any) => r.prediction.decision === 'KEEP').length,
  tk = rows.filter(
    (r: any) => r.prediction.decision === 'KEEP' && r.gold?.decision === 'KEEP',
  ).length,
  gk = rows.filter((r: any) => r.gold?.decision === 'KEEP').length;
const out = {
  classifierFreeze: predictions.classifierFreeze,
  total: rows.length,
  rows,
  metrics: {
    keepPrecision: pk ? tk / pk : null,
    keepRecall: gk ? tk / gk : null,
    reviewRate: rows.filter((r: any) => r.prediction.decision === 'REVIEW').length / rows.length,
    rejectRate: rows.filter((r: any) => r.prediction.decision === 'REJECT').length / rows.length,
    falseKeep: rows.filter(
      (r: any) => r.prediction.decision === 'KEEP' && r.gold?.decision !== 'KEEP',
    ).length,
    falseReject: rows.filter(
      (r: any) => r.prediction.decision === 'REJECT' && r.gold?.decision === 'KEEP',
    ).length,
    overallAgreement:
      rows.filter((r: any) => r.prediction.decision === r.gold?.decision).length / rows.length,
    propositionAccuracy:
      rows.filter(
        (r: any) =>
          r.prediction.evidenceProposition?.statement &&
          r.gold?.proposition &&
          r.prediction.evidenceProposition.statement.includes(r.gold.proposition),
      ).length / Math.max(1, rows.filter((r: any) => r.gold?.proposition).length),
    entityRoleAccuracy:
      rows.filter((r: any) => r.prediction.relevanceRole === r.gold?.role).length / rows.length,
    supportedDimensionAccuracy: null,
  },
  confusionMatrix: matrix,
};
writeFileSync(
  `${root}/artifacts/semantic-evidence-pilot3-gold-eval.json`,
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out.metrics, null, 2));
