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
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x)) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug='violencia' AND e.type='CONCEPT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== 1) throw new Error(`Expected 1 published concept, got ${rows.length}`);
const r = rows[0];
const relatedEs = r.related.slice(0, 6).length ? r.related.slice(0, 6).join(', ') : '';
const relatedEn = r.related.slice(0, 6).join(', ');
const summary_es = relatedEs
  ? `El concepto de ${r.title} ofrece una herramienta para interpretar relaciones entre imágenes, prácticas y contextos. En el catálogo se conecta con ${relatedEs}, sin quedar reducido a una única definición o uso.`
  : `El concepto de ${r.title} ofrece una herramienta abierta para interpretar relaciones entre imágenes, prácticas y contextos, sin quedar reducido a una única definición o uso.`;
const summary_en = relatedEn
  ? `The concept of ${r.enTitle} offers a tool for interpreting relations between images, practices and contexts. The catalogue connects it with ${relatedEn}, without reducing it to a single definition or use.`
  : `The concept of ${r.enTitle} offers an open tool for interpreting relations between images, practices and contexts, without reducing it to a single definition or use.`;
let sql = `BEGIN;UPDATE "Entity" SET summary=${q(summary_es)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='PUBLISHED';`;
for (const locale of ['es', 'en'])
  sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.enTitle : r.title)},${q(locale === 'en' ? summary_en : summary_es)},${q(locale === 'en' ? summary_en : summary_es)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-quality-concepts-batch-094.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_CONCEPTS_094', selection: 'Final published concept with summary under 120 characters', row: { ...r, summary_es, summary_en } }, null, 2)}\n`,
);
console.log('ENTITY_QUALITY_CONCEPTS_094: expanded 1 short concept summary transactionally.');
