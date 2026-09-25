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
  'cmsvvxkrh01xp85sjszd8qolg',
  'cmsvvxks601xz85sji7ft0pj3',
  'cmsvvxmgy02mw85sjch6ne1cf',
  'cmsvvxko001w985sj1cmi793g',
  'cmsvvxmd002le85sjvaittl39',
  'cmsvvxkxa020185sjule7iq6r',
  'cmsvvxmf402m685sjmdgcxx5s',
  'cmsvvxkzg020v85sj2rsqyl7b',
  'cmsvvxme002lq85sjex2g4w8r',
  'cmsvvxkk601up85sj6rkvcckx',
  'cmsvvxkjr01uj85sj58fym5pa',
  'cmsvvxlte02d485sjq7n3wumk',
  'cmtaf2hos001i07qtbmxctiil',
  'cmsvvxkx001zx85sjf4cur90w',
  'cmsvvxmgo02ms85sjass5urcu',
  'cmsvvxmgd02mo85sj0qz0qxsa',
  'cmsvvxkxt020985sjamyqcpof',
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
  'Batch 013: cierre del bloque artista–movimiento; relaciones publicadas con cobertura documental y redacción bilingüe conservadora y no causal.';
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-013.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_013', selection: '17 published artist-to-movement relations closing the artist block', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 013: applied ${out.length} artist-to-movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
