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
const slugs = ['cuerpo', 'romanticismo', '_wave002-2bb9a92d7a020f5b', '_wave002-9e02455aa003ca73'];
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.type,x.slug) FROM (SELECT e.id,e.slug,e.title,e.type,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published entities, got ${rows.length}`);
const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
const labels = {
  CONCEPT: ['El concepto', 'The concept'],
  MOVEMENT: ['El movimiento', 'The movement'],
  PERSON: ['La trayectoria de', 'The practice of'],
  TEXT: ['El texto', 'The text'],
};
const out = rows.map((r) => {
  const relatedEs = natural(r.related.slice(0, 6));
  const relatedEn = r.related.slice(0, 6).join(', ');
  const [labelEs, labelEn] = labels[r.type];
  const summaryEs = relatedEs
    ? `${labelEs} ${r.title} permite interpretar debates, prácticas y contextos que atraviesan el catálogo. Se relaciona con ${relatedEs}, y su lectura atiende a las conexiones históricas y conceptuales que hacen visible.`
    : `${labelEs} ${r.title} permite interpretar debates, prácticas y contextos que atraviesan el catálogo. Su lectura atiende a las conexiones históricas y conceptuales que hace visibles.`;
  const summaryEn = relatedEn
    ? `${labelEn} ${r.enTitle} offers a way to interpret debates, practices and contexts across the catalogue. It connects with ${relatedEn}, drawing attention to the historical and conceptual links it makes visible.`
    : `${labelEn} ${r.enTitle} offers a way to interpret debates, practices and contexts across the catalogue. Its reading draws attention to the historical and conceptual links it makes visible.`;
  const contentEs = `${summaryEs} El registro incorpora esta referencia para facilitar una lectura comparada y situada, sin agotarla en una sola interpretación.`;
  const contentEn = `${summaryEn} The record includes this reference to support a comparative and situated reading, without exhausting it in a single interpretation.`;
  return {
    ...r,
    content_es: contentEs,
    content_en: contentEn,
    essay_es: contentEs,
    essay_en: contentEn,
  };
});
let sql = 'BEGIN;';
for (const r of out) {
  sql += `UPDATE "Entity" SET content=${q(r.content_es)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='PUBLISHED';`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","essay","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.enTitle : r.title)},${q(r['essay_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "essay"=EXCLUDED."essay","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-quality-mixed-content-batch-100.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_MIXED_CONTENT_100', selection: 'All remaining published entities with base content under 300 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_MIXED_CONTENT_100: expanded ${out.length} remaining entity contents transactionally.`,
);
