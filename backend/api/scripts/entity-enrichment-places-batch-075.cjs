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
  djenne: [
    'Djenné es un centro histórico del Sahel asociado a arquitectura de tierra, redes comerciales, saberes islámicos y tradiciones culturales de África occidental.',
    'Djenné is a historic Sahelian centre associated with earthen architecture, trade networks, Islamic learning and cultural traditions of West Africa.',
  ],
  florencia: [
    'Florencia fue un centro decisivo del Renacimiento italiano, con talleres, mecenazgo, instituciones y debates sobre arte, ciencia y representación.',
    'Florence was a decisive centre of the Italian Renaissance, with workshops, patronage, institutions and debates about art, science and representation.',
  ],
  hanoi: [
    'Hanói reúne patrimonio urbano, tradiciones artesanales, arquitectura y transformaciones modernas vinculadas a la historia cultural de Vietnam.',
    'Hanoi brings together urban heritage, craft traditions, architecture and modern transformations connected to Vietnam’s cultural history.',
  ],
  jartum: [
    'Jartum ofrece un contexto para estudiar intercambios culturales, historia colonial y prácticas artísticas contemporáneas en la confluencia del Nilo.',
    'Khartoum offers a context for studying cultural exchange, colonial history and contemporary artistic practices at the confluence of the Nile.',
  ],
  johannesburgo: [
    'Johannesburgo es un centro urbano de arte contemporáneo, fotografía, memoria y debates sobre desigualdad, minería y transformación social en Sudáfrica.',
    'Johannesburg is an urban centre of contemporary art, photography, memory and debates about inequality, mining and social transformation in South Africa.',
  ],
  kyoto: [
    'Kioto reúne templos, jardines, artes del libro, cerámica, diseño y tradiciones artesanales que atraviesan la historia visual de Japón.',
    'Kyoto brings together temples, gardens, book arts, ceramics, design and craft traditions across Japan’s visual history.',
  ],
  lagos: [
    'Lagos es un centro artístico y cultural de Nigeria donde convergen música, cine, diseño, arte contemporáneo y debates sobre urbanización.',
    'Lagos is an artistic and cultural centre in Nigeria where music, film, design, contemporary art and debates about urbanisation converge.',
  ],
  'la-habana': [
    'La Habana reúne arquitectura colonial, modernidad caribeña, instituciones culturales y prácticas artísticas vinculadas a memoria, revolución e identidad.',
    'Havana brings together colonial architecture, Caribbean modernity, cultural institutions and artistic practices connected to memory, revolution and identity.',
  ],
  londres: [
    'Londres es un centro internacional de museos, mercados, academias y escenas artísticas que han influido en la circulación global del arte moderno y contemporáneo.',
    'London is an international centre of museums, markets, academies and artistic scenes that have shaped the global circulation of modern and contemporary art.',
  ],
  'los-angeles': [
    'Los Ángeles ofrece un contexto de cine, arquitectura, cultura popular, migración y prácticas contemporáneas vinculadas a la expansión urbana.',
    'Los Angeles offers a context of film, architecture, popular culture, migration and contemporary practices connected to urban expansion.',
  ],
  madrid: [
    'Madrid reúne colecciones, museos, academias y escenas artísticas relacionadas con la historia de España y con redes culturales internacionales.',
    'Madrid brings together collections, museums, academies and artistic scenes connected to Spain’s history and international cultural networks.',
  ],
  mantua: [
    'Mantua fue un centro de mecenazgo renacentista donde arquitectura, pintura, corte y relaciones políticas participaron en la construcción de una cultura visual.',
    'Mantua was a Renaissance patronage centre where architecture, painting, court life and political relations shaped a visual culture.',
  ],
  milan: [
    'Milán articula diseño, industria, arquitectura, moda e instituciones culturales en una historia marcada por modernización y experimentación artística.',
    'Milan brings together design, industry, architecture, fashion and cultural institutions in a history marked by modernisation and artistic experimentation.',
  ],
  moscu: [
    'Moscú es un contexto fundamental para estudiar iconos, arquitectura, vanguardias, pedagogías artísticas y transformaciones políticas en Rusia.',
    'Moscow is a key context for studying icons, architecture, avant-gardes, art pedagogies and political transformations in Russia.',
  ],
  mumbai: [
    'Bombay es un centro de cine, comercio, arquitectura y arte contemporáneo que refleja la diversidad cultural y la modernización de India.',
    'Mumbai is a centre of film, commerce, architecture and contemporary art reflecting India’s cultural diversity and modernisation.',
  ],
  munich: [
    'Múnich reúne academias, museos y movimientos artísticos vinculados a simbolismo, modernidad y transformaciones culturales en Alemania.',
    'Munich brings together academies, museums and artistic movements connected to symbolism, modernity and cultural transformations in Germany.',
  ],
  napoles: [
    'Nápoles ofrece un contexto de arqueología, pintura, arquitectura y vida urbana donde se cruzan herencias mediterráneas y transformaciones históricas.',
    'Naples offers a context of archaeology, painting, architecture and urban life where Mediterranean inheritances and historical transformations intersect.',
  ],
  'nueva-york': [
    'Nueva York es un centro decisivo del arte moderno y contemporáneo, con museos, galerías, escuelas y escenas vinculadas a migración y cultura urbana.',
    'New York is a decisive centre of modern and contemporary art, with museums, galleries, schools and scenes connected to migration and urban culture.',
  ],
  nuremberg: [
    'Núremberg reúne patrimonio medieval, historia política, imprenta y memoria pública en una relación compleja entre ciudad, imagen e identidad alemana.',
    'Nuremberg brings together medieval heritage, political history, printing and public memory in a complex relation between city, image and German identity.',
  ],
  paris: [
    'París ha sido un centro internacional de academias, vanguardias, museos, galerías y redes de intercambio que transformaron el arte moderno.',
    'Paris has been an international centre of academies, avant-gardes, museums, galleries and exchange networks that transformed modern art.',
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
  'artifacts/editorial-recovery/entity-enrichment-places-batch-075.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PLACES_075', selection: 'Next 20 published places missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_PLACES_075: updated ${out.length} places with bilingual base editorial fields transactionally.`,
);
