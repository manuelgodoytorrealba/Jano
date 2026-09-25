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
  'cmsvvxm9l02jz85sjmuqtqgug',
  'cmsvvxm8i02jj85sjamnzs8p4',
  'cmsvvxnrq036885sjhjmgurfd',
  'cmqtmewk5001s35nyilk5xzej',
  'cmsvvxm8e02jh85sjqduly120',
  'cmsvvxm7x02ja85sjcbau9dcj',
  'cmsvvxm8002jb85sjvj2rfnsc',
  'cmtfo81ok01u101pbj5jvhx9r',
  'cmsvvxnrt036985sjd19gecwv',
  'cmsvvxm8702je85sjldrnjuj7',
  'cmsvvxm7s02j885sjyc5xoc6v',
  'cmsvvxnrx036b85sjtys51z8h',
  'cmqtmkwb5002135nyf84d2bx2',
  'cmsvvxm8k02jk85sjkziuyuqg',
  'cmsvvxm9202jr85sjderisri3',
  'cmsvvxm9d02jw85sj2ebrz33f',
  'cmsvvxma202k685sjxzlr8si6',
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
  'Batch 019: cierre del bloque global BELONGS_TO_PERIOD; ubicación temporal basada en relación publicada y fuentes registradas, sin extrapolaciones.';
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-019.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_019', selection: '17 published BELONGS_TO_PERIOD relations closing the block', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 019: applied ${out.length} BELONGS_TO_PERIOD relations / ${out.length * 2} bilingual justifications transactionally.`,
);
