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
const slugs = [
  'moda',
  'muerte',
  'mural',
  'museo',
  'musica',
  'naturaleza',
  'oro',
  'paisaje',
  'paisaje-urbano',
  'papel',
  'pigmento',
  'pintura-religiosa',
  'poesia',
  'red',
  'representacion',
  'restitucion',
  'retrato',
  'revolucion',
  'ritmo',
  'sagrado',
];
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='CONCEPT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published concepts, got ${rows.length}`);
const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
const out = rows.map((r) => {
  const relatedEs = natural(r.related.slice(0, 6));
  const relatedEn = r.related.slice(0, 6).join(', ');
  const summary_es = relatedEs
    ? `El concepto de ${r.title} ofrece una herramienta para interpretar relaciones entre imágenes, prácticas y contextos. En el catálogo se conecta con ${relatedEs}, sin quedar reducido a una única definición o uso.`
    : `El concepto de ${r.title} ofrece una herramienta abierta para interpretar relaciones entre imágenes, prácticas y contextos, sin quedar reducido a una única definición o uso.`;
  const summary_en = relatedEn
    ? `The concept of ${r.enTitle} offers a tool for interpreting relations between images, practices and contexts. The catalogue connects it with ${relatedEn}, without reducing it to a single definition or use.`
    : `The concept of ${r.enTitle} offers an open tool for interpreting relations between images, practices and contexts, without reducing it to a single definition or use.`;
  return { ...r, summary_es, summary_en };
});
let sql = 'BEGIN;';
for (const r of out) {
  sql += `UPDATE "Entity" SET summary=${q(r.summary_es)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='PUBLISHED';`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.enTitle : r.title)},${q(r['summary_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-quality-concepts-batch-092.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_CONCEPTS_092', selection: 'Next 20 published concepts with summaries under 120 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_CONCEPTS_092: expanded ${out.length} short concept summaries transactionally.`,
);
