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
  'bartolome-esteban-murillo',
  'beatriz-gonzalez',
  'caspar-david-friedrich',
  'claude-monet',
  'edouard-manet',
  'edward-hopper',
  'francis-bacon',
  'giambattista-tiepolo',
  'henri-cartier-bresson',
  'marcel-duchamp',
  'sol-lewitt',
  '_wave002-499508459a2cf989',
  '_wave002-807694c624b3ebf6',
];
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='ARTIST' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published artists, got ${rows.length}`);
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
    ? `${r.title} desarrolló una práctica artística vinculada a su contexto histórico y a una investigación sostenida sobre las formas de hacer y mirar. En el catálogo, su trayectoria se relaciona con ${relatedEs}. Estas conexiones permiten leer sus obras como parte de una red de técnicas, debates y transformaciones, atendiendo tanto a sus aportaciones como a las tensiones de su tiempo.`
    : `${r.title} desarrolló una práctica artística vinculada a su contexto histórico y a una investigación sostenida sobre las formas de hacer y mirar. El catálogo presenta su trayectoria como parte de una red de técnicas, debates y transformaciones, atendiendo tanto a sus aportaciones como a las tensiones de su tiempo.`;
  const content_en = relatedEn
    ? `${r.enTitle} developed an artistic practice shaped by its historical context and by sustained research into ways of making and seeing. In the catalogue, the artist's trajectory is connected with ${relatedEn}. These links present the works as part of a network of techniques, debates and transformations, while attending to both their contributions and the tensions of their time.`
    : `${r.enTitle} developed an artistic practice shaped by its historical context and by sustained research into ways of making and seeing. The catalogue presents the artist's trajectory as part of a network of techniques, debates and transformations, while attending to both their contributions and the tensions of their time.`;
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
  'artifacts/editorial-recovery/entity-quality-artists-content-batch-097.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_ARTISTS_CONTENT_097', selection: 'Remaining published artists with base content under 300 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_ARTISTS_CONTENT_097: expanded ${out.length} artist contents transactionally.`,
);
