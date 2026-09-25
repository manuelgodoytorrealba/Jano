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
  'cmsvvxm8502jd85sjzb2d71vt',
  'cmsvvxm9a02jv85sj4jz201xg',
  'cmsvvxm9402js85sjx08b5b9e',
  'cmsvvxm9602jt85sja0rjqzpg',
  'cmsvvxm9802ju85sj6wkr6j3u',
  'cmsvvxnro036785sjyjwdvmmf',
  'cmsvvxm8u02jo85sjrr6nvv4d',
  'cmsvvxm9g02jx85sjq8cub90i',
  'cmsvvxm8s02jn85sjdrmnh4uf',
  'cmsvvxm9s02k285sjpo92ooxq',
  'cmsvvxm6s02ir85sj75o9xtks',
  'cmsvvxm8z02jq85sj9tjwhj3e',
  'cmsvvxm7v02j985sj9vmatpcm',
  'cmsvvxnrv036a85sjiysecamm',
  'cmsvvxm8g02ji85sj9lug3t0i',
  'cmsvvxm9i02jy85sjwhkrnzmb',
  'cmsvvxm9u02k385sji6w05gyr',
  'cmsvvxm8302jc85sj3kzm5cj2',
  'cmsvvxm9o02k085sjtssidjj6',
  'cmsvvxm9x02k485sjbywd44c2',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId" IN (r."fromId",r."toId")),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published period relations, got ${rows.length}`);
const note =
  'Batch 018: continuación del bloque global BELONGS_TO_PERIOD; ubicación temporal basada en relación publicada y fuentes registradas, sin extrapolaciones.';
const out = rows.map((r) => ({
  ...r,
  locales: {
    es: `La relación sitúa ${r.fromTitle} dentro de ${r.toTitle}, el periodo histórico con el que se vincula. El vínculo ayuda a ubicar su desarrollo en un momento cultural concreto.`,
    en: `The relation places ${r.fromTitle} within ${r.toTitle}, the historical period with which it is associated. It helps locate its development within a specific cultural moment.`,
  },
  claimsUsed: ['relation:BELONGS_TO_PERIOD', `published-entities:${r.fromSlug},${r.toSlug}`],
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-018.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_018', selection: '20 published BELONGS_TO_PERIOD relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 018: applied ${out.length} BELONGS_TO_PERIOD relations / ${out.length * 2} bilingual justifications transactionally.`,
);
