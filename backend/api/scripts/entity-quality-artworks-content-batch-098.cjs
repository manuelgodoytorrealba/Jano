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
  'la-danza-matisse',
  'la-porcion-de-la-guerra',
  'las-espigadoras',
  'lobster-telephone',
  'los-guerreros',
  'magdalena',
  'maquina-de-trinar',
  'mobile-calder-rojo',
  'monograma',
  'retrato-de-adele-bloch-bauer',
  'semiotica-de-la-cocina',
  'seul-hogar',
  'spiral-jetty',
  'tan-tan-bo',
  'the-last-sound',
  'vapor-y-nubes-de-steam-boat',
];
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='ARTWORK' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published artworks, got ${rows.length}`);
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
    ? `La obra ${r.title} articula una investigación sobre materiales, imágenes y formas de experiencia dentro de su contexto artístico. En el catálogo se relaciona con ${relatedEs}. Esta red permite atender a sus decisiones formales, a las condiciones de producción y a las preguntas históricas que activa la pieza.`
    : `La obra ${r.title} articula una investigación sobre materiales, imágenes y formas de experiencia dentro de su contexto artístico. El catálogo atiende a sus decisiones formales, a las condiciones de producción y a las preguntas históricas que activa la pieza.`;
  const content_en = relatedEn
    ? `The work ${r.enTitle} develops an inquiry into materials, images and forms of experience within its artistic context. The catalogue connects it with ${relatedEn}. This network draws attention to its formal decisions, conditions of production and the historical questions activated by the piece.`
    : `The work ${r.enTitle} develops an inquiry into materials, images and forms of experience within its artistic context. The catalogue attends to its formal decisions, conditions of production and the historical questions activated by the piece.`;
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
  'artifacts/editorial-recovery/entity-quality-artworks-content-batch-098.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_ARTWORKS_CONTENT_098', selection: 'All published artworks with base content under 300 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_ARTWORKS_CONTENT_098: expanded ${out.length} artwork contents transactionally.`,
);
