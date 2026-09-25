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
  'cmsvvxmbq02kw85sjby9qtt8s',
  'cmsvvxkga01t385sjtba8szmy',
  'cmsvvxkge01t585sjywipv5m0',
  'cmsvvxkqd01x985sjn9vzlb15',
  'cmsvvxkg501t185sj806wvql6',
  'cmsvvxmb502kn85sjyiae9khb',
  'cmsvvxkoz01wp85sj9z4lui4p',
  'cmsvvxkov01wn85sjvkgvy8xv',
  'cmsvvxkj301u985sjq7bk45tb',
  'cmsvvxltw02dc85sj96mnwqkq',
  'cmsvvxmgl02mr85sjxciwnoaz',
  'cmsvvxkf701sn85sjxbl1g2bb',
  'cmsvvxkif01tz85sjfwfghsgh',
  'cmsvvxkr801xl85sjo0xbahnm',
  'cmsvvxkrt01xt85sj7xowxn6o',
  'cmsvvxktm01yl85sjeofxcw2z',
  'cmsvvxmh902n085sj8jppw40q',
  'cmsvvxkol01wj85sjxwdpbk2q',
  'cmsvvxmg202mk85sjuv7pxn85',
  'cmsvvxkp401wr85sjm08n7tsf',
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
  FROM "Relation" r
  JOIN "RelationType" rt ON rt.id=r."relationTypeId"
  JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId"
  WHERE r.id IN (${ids}) AND r.status='PUBLISHED' AND a.type='ARTIST' AND t.type='MOVEMENT'
) x`),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published artist relations, got ${rows.length}`);

const es = (artist, movement) =>
  `La relación sitúa a ${artist} dentro de ${movement}, el movimiento artístico con el que se vincula. El vínculo ayuda a leer su práctica en un marco histórico y formal compartido.`;
const en = (artist, movement) =>
  `The relation places ${artist} within ${movement}, the artistic movement with which it is associated. It helps read the artist’s practice within a shared historical and formal framework.`;
const note =
  'Batch 004: selección priorizada de relaciones artista–movimiento publicadas con cobertura documental; redacción bilingüe conservadora y no causal.';
const out = rows.map((row) => ({
  ...row,
  locales: { es: es(row.fromTitle, row.toTitle), en: en(row.fromTitle, row.toTitle) },
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-004.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_004', selection: '20 published artist-to-movement relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 004: applied ${out.length} artist-to-movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
