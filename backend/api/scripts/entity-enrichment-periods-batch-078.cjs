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
  antiguedad: [
    'La Antigüedad reúne sociedades y culturas del mundo antiguo cuyas imágenes, arquitecturas, escrituras y objetos permiten estudiar formas tempranas de organización política y ritual.',
    'Antiquity encompasses societies and cultures of the ancient world whose images, architecture, writing and objects reveal early forms of political and ritual organisation.',
  ],
  'edad-antigua': [
    'La Edad Antigua es una periodización amplia que comprende diversas civilizaciones, ciudades, imperios y tradiciones visuales del Mediterráneo, Asia y África.',
    'The Ancient Age is a broad periodisation encompassing diverse civilisations, cities, empires and visual traditions across the Mediterranean, Asia and Africa.',
  ],
  'edad-contemporanea': [
    'La Edad Contemporánea designa el periodo histórico marcado por industrialización, estados modernos, medios de masas, globalización y transformaciones aceleradas de la cultura visual.',
    'The Contemporary Age designates a historical period marked by industrialisation, modern states, mass media, globalisation and accelerated transformations in visual culture.',
  ],
  'edad-media': [
    'La Edad Media reúne contextos europeos, mediterráneos, africanos y asiáticos diversos, con especial importancia de religión, manuscritos, arquitectura, ritual y circulación de saberes.',
    'The Middle Ages encompass diverse European, Mediterranean, African and Asian contexts, with a major role for religion, manuscripts, architecture, ritual and the circulation of knowledge.',
  ],
  'edad-moderna': [
    'La Edad Moderna comprende transformaciones vinculadas a expansión comercial, estados, colonialismo, imprenta, ciencia y nuevas formas de representación entre los siglos XV y XVIII.',
    'The Early Modern Age encompasses transformations linked to commercial expansion, states, colonialism, print, science and new forms of representation from the fifteenth to the eighteenth centuries.',
  ],
  neolitico: [
    'El Neolítico designa procesos de sedentarización, agricultura y nuevas formas comunitarias cuya cultura material incluye arquitectura, cerámica, tejido e imágenes rituales.',
    'The Neolithic designates processes of settlement, agriculture and new communal forms whose material culture includes architecture, ceramics, textiles and ritual images.',
  ],
  paleolitico: [
    'El Paleolítico comprende largas sociedades de cazadores-recolectores y sus tecnologías, prácticas funerarias y expresiones visuales, entre ellas diversas formas de arte rupestre.',
    'The Palaeolithic encompasses long histories of hunter-gatherer societies, technologies, funerary practices and visual expressions, including diverse forms of rock art.',
  ],
  prehistoria: [
    'La Prehistoria reúne periodos anteriores a los registros escritos y exige atender a la diversidad arqueológica, material y territorial de sus sociedades.',
    'Prehistory encompasses periods before written records and requires attention to the archaeological, material and territorial diversity of its societies.',
  ],
  renacimiento: [
    'El Renacimiento reúne transformaciones artísticas e intelectuales desarrolladas en distintas regiones entre los siglos XIV y XVI, con nuevas relaciones entre antigüedad, naturaleza, ciencia y representación.',
    'The Renaissance encompasses artistic and intellectual transformations across different regions from the fourteenth to the sixteenth centuries, reshaping relations between antiquity, nature, science and representation.',
  ],
  'siglo-xx': [
    'El siglo XX estuvo marcado por guerras, industrialización, medios de masas, vanguardias y cambios sociales que transformaron radicalmente las prácticas artísticas.',
    'The twentieth century was shaped by wars, industrialisation, mass media, avant-gardes and social change that radically transformed artistic practices.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='PERIOD' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published periods, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten concretar la periodización a través de lugares, obras, artistas y movimientos.` : 'La entrada funciona como un marco cronológico abierto para investigar contextos concretos.'}\n\n## Cómo continuar\n\nLas periodizaciones son herramientas de lectura y pueden variar según región, disciplina y fuente; conviene evitar tratarlas como límites universales.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths make the periodisation concrete through places, works, artists and movements.` : 'This entry is an open chronological framework for investigating specific contexts.'}\n\n## How to continue\n\nPeriodisations are interpretive tools and may vary by region, discipline and source; they should not be treated as universal boundaries.`,
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
  'artifacts/editorial-recovery/entity-enrichment-periods-batch-078.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PERIODS_078', selection: '10 published periods missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_PERIODS_078: updated ${out.length} periods with bilingual base editorial fields transactionally.`,
);
