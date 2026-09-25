const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const db = (sql) =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'infra-db-1',
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'jano',
      '-d',
      'jano',
    ],
    { input: sql, encoding: 'utf8' },
  );
const relationIds = [
  'cmsvvxoak03ea85sj46bs2mab',
  'cmsvvxocd03f085sjddkco8mn',
  'cmsvvxoca03ez85sjb4z0riz8',
  'cmsvvxobr03er85sjm9cilj0l',
  'cmsvvxobo03eq85sjknjmvdf5',
  'cmsvvxocy03f985sjbznr92zv',
  'cmsvvxocs03f685sj99ii69ce',
  'cmsvvxocu03f785sjgr406wil',
  'cmsvvxocw03f885sju69k7hn3',
  'cmsvvxm7102iw85sj5313lblm',
  'cmsvvxod003fa85sjobvrfswb',
  'cmsvvxocf03f185sjiq7ktpay',
  'cmsvvxod903fe85sjqz0rkt6r',
  'cmsvvxmsh02s185sjk1j0hot8',
  'cmsvvxm6u02is85sjhsynew6o',
  'cmsvvxocm03f485sjzhr51jmq',
  'cmsvvxobd03el85sjedw0ugoi',
  'cmsvvxoc303ew85sj01csm5ta',
  'cmsvvxod203fb85sj6vssjt6s',
  'cmsvvxodb03ff85sjdko6f05e',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId" IN (r."fromId",r."toId")),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published concept relations, got ${rows.length}`);
const note =
  'Batch 015: continuación del bloque global ABOUT_CONCEPT; asociación editorial basada en relación publicada y fuentes registradas, sin interpretación cerrada.';
const out = rows.map((r) => ({
  ...r,
  locales: {
    es: `La relación conecta ${r.fromTitle} con ${r.toTitle}, un concepto que forma parte de su marco de lectura. El vínculo señala una asociación editorial sin convertirla por sí solo en una interpretación cerrada.`,
    en: `The relation connects ${r.fromTitle} with ${r.toTitle}, a concept that forms part of its interpretive framework. It signals an editorial association without making it, by itself, a fixed interpretation.`,
  },
  claimsUsed: ['relation:ABOUT_CONCEPT', `published-entities:${r.fromSlug},${r.toSlug}`],
  sourcesUsed: r.sources,
  reviewNote: note,
}));
let sql = 'BEGIN;';
for (const r of out)
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(r.locales[locale])},'APPROVED',${q(JSON.stringify(r.claimsUsed))}::jsonb,${q(JSON.stringify(r.sourcesUsed))}::jsonb,${q(r.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-015.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_015', selection: '20 published ABOUT_CONCEPT relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 015: applied ${out.length} ABOUT_CONCEPT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
