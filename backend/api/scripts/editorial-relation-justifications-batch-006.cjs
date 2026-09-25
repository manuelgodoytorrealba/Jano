const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
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
  'cmsvvxkpp01wz85sjenhxilbf',
  'cmsvvxkfk01st85sjuy427145',
  'cmsvvxmda02li85sjjarx449w',
  'cmsvvxkfv01sx85sj9ea34hof',
  'cmsvvxkwk01zr85sj307bqtu5',
  'cmsvvxmhc02n285sj7ddh5hd5',
  'cmsvvxktr01yn85sjglb3lqj8',
  'cmsvvxkgo01t985sj0if757ki',
  'cmsvvxkuw01z385sju9gt1vht',
  'cmsvvxkr301xj85sj230lh0ya',
  'cmsvvxkg001sz85sjw7h92xvp',
  'cmsvvxmb802ko85sjf6t98e01',
  'cmsvvxkvz01zj85sj9dtykai0',
  'cmsvvxkwe01zp85sjsbvwkj7e',
  'cmsvvxkur01z185sjggcfu4d7',
  'cmsvvxmcf02l685sjov9vsv8n',
  'cmsvvxkuc01yv85sj0hvz0yfe',
  'cmsvvxkva01z985sj349ds5zq',
  'cmsvvxkkj01ut85sjp4rslf0f',
  'cmsvvxmei02lx85sjixv4sybf',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(`
SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug", x."toSlug")
FROM (
  SELECT r.id AS "relationId", rt.key AS "relationType",
    a.slug AS "fromSlug", a.title AS "fromTitle", t.slug AS "toSlug", t.title AS "toTitle",
    COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title)
      FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId"
      WHERE sr."entityId" IN (r."fromId", r."toId")), '[]'::json) AS sources
  FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId"
  JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId"
  WHERE r.id IN (${ids}) AND r.status='PUBLISHED' AND a.type='ARTIST' AND t.type='MOVEMENT'
) x`),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published artist relations, got ${rows.length}`);

const note =
  'Batch 006: selección priorizada de relaciones artista–movimiento publicadas con cobertura documental; redacción bilingüe conservadora y no causal.';
const out = rows.map((row) => ({
  ...row,
  locales: {
    es: `La relación sitúa a ${row.fromTitle} dentro de ${row.toTitle}, el movimiento artístico con el que se vincula. El vínculo ayuda a leer su práctica en un marco histórico y formal compartido.`,
    en: `The relation places ${row.fromTitle} within ${row.toTitle}, the artistic movement with which it is associated. It helps read the artist’s practice within a shared historical and formal framework.`,
  },
  status: 'APPROVED',
  claimsUsed: ['relation:BELONGS_TO_MOVEMENT', `published-entities:${row.fromSlug},${row.toSlug}`],
  sourcesUsed: row.sources,
  reviewNote: note,
}));

let sql = 'BEGIN;';
for (const row of out)
  for (const locale of ['es', 'en']) {
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(row.relationId + locale)}),${q(row.relationId)},${q(locale)},${q(row.locales[locale])},'APPROVED',${q(JSON.stringify(row.claimsUsed))}::jsonb,${q(JSON.stringify(row.sourcesUsed))}::jsonb,${q(row.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  }
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-006.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_006', selection: '20 published artist-to-movement relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 006: applied ${out.length} artist-to-movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
