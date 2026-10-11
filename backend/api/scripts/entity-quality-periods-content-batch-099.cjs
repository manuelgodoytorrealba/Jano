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
const slugs = ['siglo-xix', 'siglo-xxi'];
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='PERIOD' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published periods, got ${rows.length}`);
const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
const out = rows.map((r) => {
  const relatedEs = natural(r.related.slice(0, 6));
  const relatedEn = r.related.slice(0, 6).join(', ');
  const content_es = relatedEs
    ? `El periodo ${r.title} reúne transformaciones artísticas, debates culturales y cambios en las formas de producir y mirar imágenes. En el catálogo se relaciona con ${relatedEs}. Esta perspectiva permite leer continuidades, rupturas y contextos sin reducir la historia del arte a una sucesión lineal de estilos.`
    : `El periodo ${r.title} reúne transformaciones artísticas, debates culturales y cambios en las formas de producir y mirar imágenes. Esta perspectiva permite leer continuidades, rupturas y contextos sin reducir la historia del arte a una sucesión lineal de estilos.`;
  const content_en = relatedEn
    ? `The period ${r.enTitle} brings together artistic transformations, cultural debates and changes in the ways images are produced and viewed. The catalogue connects it with ${relatedEn}. This perspective makes it possible to read continuities, ruptures and contexts without reducing art history to a linear succession of styles.`
    : `The period ${r.enTitle} brings together artistic transformations, cultural debates and changes in the ways images are produced and viewed. This perspective makes it possible to read continuities, ruptures and contexts without reducing art history to a linear succession of styles.`;
  return { ...r, content_es, content_en, essay_es: content_es, essay_en: content_en };
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
  'artifacts/editorial-recovery/entity-quality-periods-content-batch-099.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_PERIODS_CONTENT_099', selection: 'All published periods with base content under 300 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_PERIODS_CONTENT_099: expanded ${out.length} period contents transactionally.`,
);
