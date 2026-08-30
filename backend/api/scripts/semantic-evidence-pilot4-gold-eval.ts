import { readFileSync, writeFileSync } from 'node:fs';
const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const pred: any = JSON.parse(
  readFileSync(`${root}/artifacts/semantic-evidence-pilot4-predictions.json`, 'utf8'),
);
const labels: any[] = [
  [
    'The Birth of Venus',
    0,
    'REVIEW',
    'ABOUT',
    null,
    'identity / visual context',
    'Mixed catalogue metadata and iconographic description; useful but span needs review.',
  ],
  [
    'The Birth of Venus',
    1,
    'KEEP',
    'PRIMARY_SUBJECT',
    'The work was probably commissioned by a member of the Medici family, although no written evidence exists before 1550.',
    'provenance / commission',
    'Bounded, uncertainty-preserving documentary statement.',
  ],
  [
    'The Birth of Venus',
    2,
    'REVIEW',
    'ABOUT',
    null,
    'interpretation',
    'A hypothesis about the orange trees; attribution and wording need editorial review.',
  ],
  [
    'The Birth of Venus',
    3,
    'KEEP',
    'PRIMARY_SUBJECT',
    'Botticelli drew Venus’s pose from classical statues and the Winds from a Hellenistic gem owned by Lorenzo the Magnificent.',
    'influence / form',
    'Concrete formal comparison in a coherent span.',
  ],
  ['Maman', 0, 'REJECT', 'UNRELATED', null, null, 'Collection listing and appointment navigation.'],
  ['Florence', 0, 'REJECT', 'UNRELATED', null, null, 'Event promotion and navigation.'],
  [
    'Neoclassicism',
    0,
    'KEEP',
    'PRIMARY_SUBJECT',
    'Neoclassicism was a particularly pure form of classicism that emerged from about 1750.',
    'definition / chronology',
    'Direct definition and chronology despite trailing collection chrome.',
  ],
  [
    'Neoclassicism',
    1,
    'REVIEW',
    'CONTEXT_FOR',
    null,
    'context / related concepts',
    'Related-term cards; possible context but no single bounded claim.',
  ],
  [
    'Donald Judd — registro de autoridad',
    0,
    'REJECT',
    'UNRELATED',
    null,
    null,
    'Structured authority record; route to structured facts, not editorial Evidence.',
  ],
];
const map = new Map(
  labels.map((x) => [
    `${x[0]}::${x[1]}`,
    { decision: x[2], role: x[3], proposition: x[4], dimension: x[5], rationale: x[6] },
  ]),
);
const rows = pred.rows.map((r: any) => {
  const idx = Number(String(r.excerpt.locator).replace('paragraph-', '')) - 1;
  return { ...r, gold: map.get(`${r.source.title}::${idx}`) };
});
const ds = ['KEEP', 'REVIEW', 'REJECT'];
const matrix = Object.fromEntries(
  ds.map((p) => [
    p,
    Object.fromEntries(
      ds.map((g) => [
        g,
        rows.filter((r: any) => r.prediction.decision === p && r.gold.decision === g).length,
      ]),
    ),
  ]),
);
const pk = rows.filter((r: any) => r.prediction.decision === 'KEEP').length,
  tk = rows.filter(
    (r: any) => r.prediction.decision === 'KEEP' && r.gold.decision === 'KEEP',
  ).length,
  gk = rows.filter((r: any) => r.gold.decision === 'KEEP').length;
const out = {
  classifierFreeze: pred.classifierFreeze,
  total: rows.length,
  rows,
  metrics: {
    keepPrecision: pk ? tk / pk : null,
    keepRecall: tk / gk,
    reviewRate: rows.filter((r: any) => r.prediction.decision === 'REVIEW').length / rows.length,
    rejectRate: rows.filter((r: any) => r.prediction.decision === 'REJECT').length / rows.length,
    falseKeep: rows.filter(
      (r: any) => r.prediction.decision === 'KEEP' && r.gold.decision !== 'KEEP',
    ).length,
    falseReject: rows.filter(
      (r: any) => r.prediction.decision === 'REJECT' && r.gold.decision === 'KEEP',
    ).length,
    overallAgreement:
      rows.filter((r: any) => r.prediction.decision === r.gold.decision).length / rows.length,
    propositionAccuracy: null,
    entityRoleAccuracy:
      rows.filter((r: any) => r.prediction.relevanceRole === r.gold.role).length / rows.length,
    dimensionAccuracy: null,
  },
  confusionMatrix: matrix,
};
writeFileSync(
  `${root}/artifacts/semantic-evidence-pilot4-gold-eval.json`,
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out.metrics, null, 2));
