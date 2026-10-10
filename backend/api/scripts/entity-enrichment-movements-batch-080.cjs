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
const copy = {
  realismo: [
    'El realismo reúne prácticas que atienden a sujetos, espacios y conflictos reconocibles, aunque sus formas y posiciones políticas varían ampliamente según contexto y época.',
    'Realism encompasses practices attentive to recognisable subjects, spaces and conflicts, although its forms and political positions vary widely by context and period.',
  ],
  'renacimiento-italiano': [
    'El Renacimiento italiano reúne transformaciones de pintura, escultura, arquitectura y cultura humanista desarrolladas en distintas ciudades y redes de mecenazgo.',
    'The Italian Renaissance encompasses transformations in painting, sculpture, architecture and humanist culture developed across different cities and patronage networks.',
  ],
  'renacimiento-nordico': [
    'El Renacimiento nórdico comprende prácticas de los territorios septentrionales de Europa que reelaboraron tradición religiosa, observación, técnica y circulación de imágenes.',
    'The Northern Renaissance encompasses practices from northern Europe that reworked religious tradition, observation, technique and the circulation of images.',
  ],
  rococo: [
    'El rococó reúne formas decorativas y pictóricas del siglo XVIII asociadas a ligereza, ornamentación, intimidad y sociabilidad cortesana, con variaciones regionales.',
    'Rococo encompasses eighteenth-century decorative and pictorial forms associated with lightness, ornament, intimacy and courtly sociability, with regional variations.',
  ],
  romanico: [
    'El románico reúne arquitecturas, esculturas, pinturas y objetos medievales vinculados a liturgia, peregrinación, monasterios y redes territoriales.',
    'Romanesque encompasses medieval architecture, sculpture, painting and objects connected to liturgy, pilgrimage, monasteries and territorial networks.',
  ],
  simbolismo: [
    'El simbolismo exploró sueño, mito, sugestión y estados interiores mediante imágenes que se apartaban de la descripción literal y del naturalismo.',
    'Symbolism explored dream, myth, suggestion and inner states through images that departed from literal description and naturalism.',
  ],
  suprematismo: [
    'El suprematismo desarrolló una abstracción geométrica centrada en formas elementales, espacio pictórico y una experiencia no objetiva de la imagen.',
    'Suprematism developed a geometric abstraction focused on elementary forms, pictorial space and a non-objective experience of the image.',
  ],
  surrealismo: [
    'El surrealismo investigó sueño, deseo, azar y automatismo para cuestionar la racionalidad dominante y ampliar las posibilidades de imagen, escritura y acción.',
    'Surrealism investigated dream, desire, chance and automatism to question dominant rationality and expand the possibilities of image, writing and action.',
  ],
  'ukiyo-e': [
    'Ukiyo-e designa un conjunto de estampas y prácticas visuales japonesas vinculadas a escenas urbanas, actores, paisajes, literatura y circulación editorial.',
    'Ukiyo-e designates a body of Japanese prints and visual practices connected to urban scenes, actors, landscapes, literature and publishing circulation.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='MOVEMENT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published movements, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar el movimiento a través de obras, artistas, conceptos, lugares y periodos.` : 'La entrada funciona como un punto de partida para investigar sus agentes, obras y contextos históricos.'}\n\n## Cómo continuar\n\nConviene atender a diferencias internas, cronológicas y geográficas, evitando convertir el movimiento en una etiqueta única o universal.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the movement to be studied through works, artists, concepts, places and periods.` : 'This entry is a starting point for investigating its agents, works and historical contexts.'}\n\n## How to continue\n\nAttend to internal, chronological and geographical differences, avoiding the reduction of the movement to a single universal label.`,
});
const out = rows.map((r) => {
  const [es, en] = copy[r.slug];
  return {
    ...r,
    summary_es: es,
    summary_en: en,
    ...Object.fromEntries(
      Object.entries(essays(r, es, en)).map(([locale, essay]) => [`essay_${locale}`, essay]),
    ),
  };
});
let sql = 'BEGIN;';
for (const r of out) {
  sql += `UPDATE "Entity" SET summary=${q(r.summary_es)},content=${q(r.essay_es)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='PUBLISHED';`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(r.title)},${q(r['summary_' + locale])},${q(r['essay_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","essay"=EXCLUDED."essay","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-movements-batch-080.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_MOVEMENTS_080', selection: '9 published movements missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_MOVEMENTS_080: updated ${out.length} movements with bilingual base editorial fields transactionally.`,
);
