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
  'agesandro',
  'agnes-martin',
  'ai-weiwei',
  'alberto-giacometti',
  'albrecht-durer',
  'alexander-calder',
  'alfred-sisley',
  'alfred-stieglitz',
  'alice-neel',
  'amara-kanwar',
  'andrea-mantegna',
  'andy-warhol',
  'angelica-kauffmann',
  'annibale-carracci',
  'antemio-de-tralles',
  'antonie-watteau',
  'antonio-canova',
  'apolodoro-de-damasco',
  'artemisia-gentileschi',
  'auguste-rodin',
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
  const summary_es = relatedEs
    ? `${r.title} aparece en el catálogo como artista relacionado con ${relatedEs}. Estas conexiones sitúan su práctica en un contexto de obras, movimientos, conceptos y lugares concretos, sin reducir su trayectoria a una sola adscripción.`
    : `${r.title} aparece en el catálogo como artista y su trayectoria se presenta como una entrada abierta para investigar obras, contextos y relaciones históricas verificables.`;
  const summary_en = relatedEn
    ? `${r.enTitle} appears in the catalogue as an artist connected with ${relatedEn}. These links place the practice within concrete contexts of works, movements, concepts and places without reducing the trajectory to a single affiliation.`
    : `${r.enTitle} appears in the catalogue as an artist whose trajectory remains open to investigation through verifiable works, contexts and historical relations.`;
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
  'artifacts/editorial-recovery/entity-quality-artists-batch-089.json',
  `${JSON.stringify({ batch: 'ENTITY_QUALITY_ARTISTS_089', selection: '20 published artists with summaries under 120 characters', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_QUALITY_ARTISTS_089: expanded ${out.length} short artist summaries transactionally.`,
);
