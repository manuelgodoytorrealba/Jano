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
  'cmsvvxm8c02jg85sj7zuh036j',
  'cmsvvxm9z02k585sji10x2d79',
  'cmsvvxmag02kc85sjdg2ptobq',
  'cmsvvxmae02kb85sjgpw61l8q',
  'cmsvvxm7n02j685sjx3csr0mn',
  'cmsvvxma402k785sj1gum2oq0',
  'cmsvvxm9q02k185sjivsef8mv',
  'cmsvvxm7h02j385sjrjtz1fgf',
  'cmsvvxm7j02j485sjn8s6jjqt',
  'cmsvvxma702k885sj8odmopg1',
  'cmsvvxm7q02j785sj5n2emhnc',
  'cmsvvxmaa02k985sjukii9rmt',
  'cmsvvxm7e02j285sjzu6xphfn',
  'cmsvvxmac02ka85sji8qc2o7r',
  'cmsvvxm6m02ip85sjmrhj58ss',
  'cmsvvxm7l02j585sj13r84dad',
  'cmsvvxm6w02it85sj73x7t2cu',
  'cmsvvxm7b02j185sjwdbdogsb',
  'cmsvvxm8p02jm85sjc0t0thqx',
  'cmsvvxm8m02jl85sjlthvzz6p',
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
  'Batch 017: inicio del bloque global BELONGS_TO_PERIOD; justificación basada en relación publicada y fuentes registradas, sin extrapolar más allá de la ubicación temporal.';
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-017.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_017', selection: '20 published BELONGS_TO_PERIOD relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 017: applied ${out.length} BELONGS_TO_PERIOD relations / ${out.length * 2} bilingual justifications transactionally.`,
);
