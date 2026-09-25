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
  'cmsvvxmbc02kq85sje5hxpukj',
  'cmsvvxmhe02n385sjzg97j8zs',
  'cmsvvxkxe020385sj9o3obgyu',
  'cmsvvxkiu01u585sj4fhkix5b',
  'cmsvvxko801wd85sj55ouriib',
  'cmtaf2how001k07qttwqlm31x',
  'cmsvvxmck02l885sjc82ot4jh',
  'cmsvvxmca02l485sjsd63xrya',
  'cmtaf2hp4001p07qt2uzreb72',
  'cmtaf2hps002207qt15532z53',
  'cmsvvxkh701th85sjyerliugd',
  'cmsvvxkjm01uh85sjx1rr17l2',
  'cmsvvxksn01y785sj01m5u7ir',
  'cmsvvxkhq01tp85sjphj5cs3u',
  'cmsvvxkro01xr85sjnxkkldta',
  'cmsvvxkhc01tj85sjyxko4eov',
  'cmsvvxkiq01u385sjkzt31xvo',
  'cmsvvxkoc01wf85sjsg70lm0c',
  'cmsvvxks101xx85sjpb2md60l',
  'cmsvvxkpu01x185sjijcyr9c2',
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
  'Batch 007: selección priorizada de relaciones artista–movimiento publicadas con cobertura documental; redacción bilingüe conservadora y no causal.';
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-007.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_007', selection: '20 published artist-to-movement relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 007: applied ${out.length} artist-to-movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
