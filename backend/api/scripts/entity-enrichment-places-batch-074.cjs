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
  alejandria: [
    'Alejandría fue un centro mediterráneo de intercambio, conocimiento y producción artística, marcado por su posición portuaria y por la convivencia de tradiciones culturales.',
    'Alexandria was a Mediterranean centre of exchange, knowledge and artistic production, shaped by its port and the coexistence of cultural traditions.',
  ],
  amsterdam: [
    'Ámsterdam es un contexto urbano relacionado con comercio, coleccionismo, instituciones culturales y transformaciones de la vida moderna en los Países Bajos.',
    'Amsterdam is an urban context associated with trade, collecting, cultural institutions and transformations of modern life in the Netherlands.',
  ],
  antwerp: [
    'Amberes fue un nodo comercial y artístico europeo donde confluyeron circulación de imágenes, talleres, imprenta, pintura y redes mercantiles.',
    'Antwerp was a European commercial and artistic node where the circulation of images, workshops, printing, painting and merchant networks converged.',
  ],
  atenas: [
    'Atenas es un lugar clave para estudiar la cultura visual griega, la arquitectura cívica, la escultura y la construcción histórica de la idea de clasicismo.',
    'Athens is a key place for studying Greek visual culture, civic architecture, sculpture and the historical construction of the idea of classicism.',
  ],
  barcelona: [
    'Barcelona reúne arquitecturas, instituciones y escenas artísticas vinculadas a modernismo, vanguardias, diseño y transformaciones urbanas.',
    'Barcelona brings together architecture, institutions and artistic scenes connected to modernisme, avant-gardes, design and urban transformation.',
  ],
  belgrado: [
    'Belgrado ofrece un contexto urbano para investigar intercambios artísticos, modernización y cambios políticos y culturales en Europa sudoriental.',
    'Belgrade offers an urban context for investigating artistic exchange, modernisation and political and cultural change in southeastern Europe.',
  ],
  'benin-city': [
    'Benin City es un centro histórico del reino de Benín, fundamental para estudiar sus artes cortesanas, fundición, memoria y circulación colonial de objetos.',
    'Benin City is the historic centre of the Kingdom of Benin, essential for studying its court arts, casting, memory and the colonial circulation of objects.',
  ],
  berlin: [
    'Berlín ha sido un escenario de experimentación artística, conflictos políticos, instituciones y reconstrucciones urbanas que atraviesan la modernidad europea.',
    'Berlin has been a site of artistic experimentation, political conflict, institutions and urban reconstruction across European modernity.',
  ],
  bogota: [
    'Bogotá es un contexto latinoamericano de museos, prácticas contemporáneas y debates sobre memoria, territorio e identidad cultural.',
    'Bogotá is a Latin American context of museums, contemporary practices and debates about memory, territory and cultural identity.',
  ],
  bruselas: [
    'Bruselas reúne arquitectura, diseño, instituciones y redes internacionales relacionadas con modernidad, Art Nouveau y vida cultural europea.',
    'Brussels brings together architecture, design, institutions and international networks connected to modernity, Art Nouveau and European cultural life.',
  ],
  bucarest: [
    'Bucarest ofrece un contexto para estudiar modernización, arquitectura, diseño y transformaciones culturales en Europa oriental.',
    'Bucharest offers a context for studying modernisation, architecture, design and cultural transformations in Eastern Europe.',
  ],
  'buenos-aires': [
    'Buenos Aires es un centro cultural latinoamericano atravesado por modernidad, migraciones, literatura, arte experimental e instituciones públicas y privadas.',
    'Buenos Aires is a Latin American cultural centre shaped by modernity, migration, literature, experimental art and public and private institutions.',
  ],
  cairo: [
    'El Cairo articula patrimonio antiguo, vida urbana, instituciones y debates contemporáneos sobre memoria, conservación y representación cultural.',
    'Cairo brings together ancient heritage, urban life, institutions and contemporary debates about memory, conservation and cultural representation.',
  ],
  chicago: [
    'Chicago es un contexto decisivo para estudiar arquitectura moderna, urbanismo, museos y relaciones entre industria, diseño y espacio público.',
    'Chicago is a key context for studying modern architecture, urbanism, museums and relations between industry, design and public space.',
  ],
  'ciudad-de-mexico': [
    'Ciudad de México reúne herencias prehispánicas, instituciones modernas y prácticas contemporáneas vinculadas a territorio, memoria e identidad.',
    'Mexico City brings together pre-Hispanic heritage, modern institutions and contemporary practices connected to territory, memory and identity.',
  ],
  constantinopla: [
    'Constantinopla fue un centro imperial y religioso de intercambio visual, donde arquitectura, mosaico, liturgia y circulación cultural adquirieron especial importancia.',
    'Constantinople was an imperial and religious centre of visual exchange where architecture, mosaic, liturgy and cultural circulation were especially significant.',
  ],
  cordoba: [
    'Córdoba permite estudiar la convivencia y transformación de tradiciones arquitectónicas, religiosas y urbanas en la historia de la península ibérica.',
    'Córdoba allows the study of the coexistence and transformation of architectural, religious and urban traditions in the history of the Iberian Peninsula.',
  ],
  cuzco: [
    'Cuzco es un centro histórico andino donde arquitectura, ritual, memoria indígena y transformaciones coloniales se articulan en el paisaje urbano.',
    'Cuzco is an Andean historical centre where architecture, ritual, Indigenous memory and colonial transformations converge in the urban landscape.',
  ],
  delhi: [
    'Delhi reúne capas históricas, arquitecturas, tradiciones religiosas e instituciones culturales que reflejan la diversidad y transformación del subcontinente indio.',
    'Delhi brings together historical layers, architecture, religious traditions and cultural institutions reflecting the diversity and transformation of the Indian subcontinent.',
  ],
  dessau: [
    'Dessau es un lugar fundamental para estudiar la Bauhaus, sus edificios, pedagogías, experimentos materiales y relación entre diseño, industria y vida cotidiana.',
    'Dessau is essential for studying the Bauhaus, its buildings, pedagogies, material experiments and relation between design, industry and everyday life.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='PLACE' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published places, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar el lugar a través de obras, artistas, movimientos y periodos concretos.` : 'La entrada funciona como un punto de partida para investigar sus capas históricas, culturales y territoriales.'}\n\n## Cómo continuar\n\nConviene distinguir entre el lugar histórico, sus representaciones y las instituciones que hoy organizan su memoria cultural.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the place to be studied through concrete works, artists, movements and periods.` : 'This entry is a starting point for investigating its historical, cultural and territorial layers.'}\n\n## How to continue\n\nDistinguish between the historical place, its representations and the institutions that organise its cultural memory today.`,
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
  'artifacts/editorial-recovery/entity-enrichment-places-batch-074.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PLACES_074', selection: 'First 20 published places missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_PLACES_074: updated ${out.length} places with bilingual base editorial fields transactionally.`,
);
