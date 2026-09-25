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
  'cmsvvxkgx01td85sjpq4374hx',
  'cmsvvxkwp01zt85sjjnzwgkdr',
  'cmsvvxktb01yh85sjrta5j5my',
  'cmtaf2hok001g07qtw015cqkf',
  'cmsvvxmcu02lc85sjcdblvgqy',
  'cmsvvxmd502lg85sjrwkez7kf',
  'cmsvvxkhh01tl85sj5ahhzk8d',
  'cmsvvxkff01sr85sjvksn7hwk',
  'cmsvvxktw01yp85sjcchkbboe',
  'cmsvvxkoh01wh85sj1klhl3hj',
  'cmsvvxmcq02la85sji4t7xpmg',
  'cmsvvxkfb01sp85sjcjzbjeo0',
  'cmsvvxlti02d685sjzhq1onf3',
  'cmsvvxmas02kh85sjzsvdcgav',
  'cmsvvxmh502my85sjkqjas9xt',
  'cmsvvxmbg02ks85sjchm9wjz4',
  'cmsvvxkkc01ur85sj1csagovc',
  'cmsvvxki101tt85sjx7m22dcz',
  'cmsvvxkv001z585sjkvq01aoz',
  'cmsvvxksf01y385sj6t9mi0nh',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId" IN (r."fromId",r."toId")),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED' AND a.type='ARTIST' AND t.type='MOVEMENT') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published artist relations, got ${rows.length}`);
const note =
  'Batch 011: selección priorizada de relaciones artista–movimiento publicadas con cobertura documental; redacción bilingüe conservadora y no causal.';
const out = rows.map((r) => ({
  ...r,
  locales: {
    es: `La relación sitúa a ${r.fromTitle} dentro de ${r.toTitle}, el movimiento artístico con el que se vincula. El vínculo ayuda a leer su práctica en un marco histórico y formal compartido.`,
    en: `The relation places ${r.fromTitle} within ${r.toTitle}, the artistic movement with which it is associated. It helps read the artist’s practice within a shared historical and formal framework.`,
  },
  claimsUsed: ['relation:BELONGS_TO_MOVEMENT', `published-entities:${r.fromSlug},${r.toSlug}`],
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-011.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_011', selection: '20 published artist-to-movement relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 011: applied ${out.length} artist-to-movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
