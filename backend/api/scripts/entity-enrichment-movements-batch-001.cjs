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
  'arquitectura-moderna': [
    'La arquitectura moderna transforma el espacio construido mediante funcionalismo, nuevos materiales, producción industrial y una atención renovada a la vida cotidiana.',
    'Modern architecture transforms the built environment through functionalism, new materials, industrial production and renewed attention to everyday life.',
  ],
  'arte-africano': [
    'El arte africano reúne tradiciones visuales muy diversas, vinculadas a comunidades, territorios, rituales, memorias y circuitos históricos específicos del continente.',
    'African art encompasses highly diverse visual traditions connected to particular communities, territories, rituals, memories and historical circuits across the continent.',
  ],
  'arte-andino': [
    'El arte andino comprende prácticas visuales y materiales de los Andes, donde tejido, cerámica, arquitectura, paisaje y ritual articulan identidades y continuidades históricas.',
    'Andean art encompasses visual and material practices from the Andes, where textiles, ceramics, architecture, landscape and ritual articulate identities and historical continuities.',
  ],
  'arte-bizantino': [
    'El arte bizantino desarrolla una cultura visual cristiana e imperial en la que iconos, mosaicos, arquitectura y liturgia organizan formas de presencia sagrada.',
    'Byzantine art develops a Christian and imperial visual culture in which icons, mosaics, architecture and liturgy organise forms of sacred presence.',
  ],
  'arte-chino': [
    'El arte chino reúne tradiciones milenarias de pintura, caligrafía, cerámica, escultura y arquitectura, relacionadas con la escritura, el paisaje, el ritual y la administración.',
    'Chinese art brings together millennia of painting, calligraphy, ceramics, sculpture and architecture, connected to writing, landscape, ritual and administration.',
  ],
  'arte-conceptual': [
    'El arte conceptual sitúa la idea, el lenguaje, el proceso o la instrucción en el centro de la obra y cuestiona la primacía del objeto artístico autónomo.',
    'Conceptual art places the idea, language, process or instruction at the centre of the work and questions the primacy of the autonomous art object.',
  ],
  'arte-performance': [
    'El arte de performance utiliza cuerpo, acción, duración, presencia y contexto como materiales, haciendo de la experiencia compartida parte constitutiva de la obra.',
    'Performance art uses body, action, duration, presence and context as materials, making shared experience a constitutive part of the work.',
  ],
  'arte-egipcio': [
    'El arte egipcio antiguo articula imagen, escritura, arquitectura y ritual para representar autoridad, continuidad cósmica y relación con los muertos.',
    'Ancient Egyptian art brings together image, writing, architecture and ritual to represent authority, cosmic continuity and relations with the dead.',
  ],
  'arte-griego': [
    'El arte griego comprende tradiciones históricas diversas en las que cuerpo, mito, arquitectura, proporción y vida cívica adquirieron formas cambiantes.',
    'Greek art encompasses diverse historical traditions in which body, myth, architecture, proportion and civic life took changing forms.',
  ],
  'arte-indio': [
    'El arte indio reúne prácticas de distintas regiones, religiones y épocas, desde escultura y arquitectura hasta pintura, textil y artes performativas.',
    'Indian art brings together practices from different regions, religions and periods, from sculpture and architecture to painting, textiles and performance traditions.',
  ],
  'arte-islamico': [
    'El arte islámico reúne culturas visuales diversas del mundo islámico, con especial presencia de caligrafía, geometría, ornamentación, arquitectura y artes del libro.',
    'Islamic art encompasses diverse visual cultures across the Islamic world, with a prominent role for calligraphy, geometry, ornament, architecture and the arts of the book.',
  ],
  'arte-maya': [
    'El arte maya articula arquitectura, escultura, pintura, escritura y objetos rituales dentro de historias políticas y cosmológicas desarrolladas en distintas ciudades y periodos.',
    'Maya art brings together architecture, sculpture, painting, writing and ritual objects within political and cosmological histories developed across different cities and periods.',
  ],
  'arte-mesopotamico': [
    'El arte mesopotámico reúne tradiciones de ciudades y estados antiguos en las que relieve, escritura, arquitectura y objetos rituales expresaron poder, memoria y culto.',
    'Mesopotamian art encompasses traditions from ancient cities and states in which relief, writing, architecture and ritual objects expressed power, memory and worship.',
  ],
  'arte-mexica': [
    'El arte mexica desarrolla una cultura visual ligada a la ciudad, el poder, el tributo y el ritual, visible en arquitectura, escultura, objetos y manuscritos.',
    'Mexica art develops a visual culture connected to the city, power, tribute and ritual, visible in architecture, sculpture, objects and manuscripts.',
  ],
  'arte-romano': [
    'El arte romano adapta y combina lenguajes de distintas regiones del imperio mediante arquitectura, retrato, escultura, pintura y cultura material.',
    'Roman art adapts and combines languages from different regions of the empire through architecture, portraiture, sculpture, painting and material culture.',
  ],
  'arte-rupestre': [
    'El arte rupestre reúne imágenes y marcas realizadas sobre superficies rocosas en contextos y cronologías diversas, cuya interpretación exige atender a su emplazamiento.',
    'Rock art encompasses images and marks made on rock surfaces in diverse contexts and chronologies, whose interpretation requires attention to their location.',
  ],
  'art-nouveau': [
    'Art Nouveau es un movimiento internacional de finales del siglo XIX y comienzos del XX que extendió la línea orgánica a arquitectura, diseño, mobiliario y artes gráficas.',
    'Art Nouveau is an international movement of the late nineteenth and early twentieth centuries that extended organic line into architecture, design, furniture and graphic arts.',
  ],
  'arts-and-crafts': [
    'Arts and Crafts fue una respuesta decimonónica a la industrialización que defendió el valor del trabajo artesanal, la calidad material y el diseño integrado en la vida cotidiana.',
    'Arts and Crafts was a nineteenth-century response to industrialisation that defended the value of handwork, material quality and design integrated into everyday life.',
  ],
  barroco: [
    'El barroco reúne prácticas artísticas de los siglos XVII y XVIII caracterizadas, con variaciones regionales, por dramatismo, ilusión, movimiento y relación con devoción y poder.',
    'Baroque encompasses artistic practices of the seventeenth and eighteenth centuries marked, with regional variations, by drama, illusion, movement and relations to devotion and power.',
  ],
  'bauhaus-movement': [
    'La Bauhaus fue una escuela y un movimiento fundados en 1919 que integraron arte, diseño, arquitectura, artesanía e industria mediante una enseñanza experimental.',
    'The Bauhaus was a school and movement founded in 1919 that integrated art, design, architecture, craft and industry through experimental teaching.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='MOVEMENT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published movements, got ${rows.length}`);
const natural = (items) =>
  items.length
    ? items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
    : '';
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${natural(r.related.slice(0, 8))}. Estas conexiones permiten situar el movimiento junto a obras, artistas, conceptos y contextos sin reducirlo a una etiqueta estilística.` : 'La entrada funciona como un punto de partida para investigar sus obras, agentes y contextos históricos.'}\n\n## Cómo continuar\n\nConviene contrastar las relaciones del catálogo con fuentes históricas y atender a las diferencias internas, cronológicas y geográficas del movimiento.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths place the movement alongside works, artists, concepts and contexts without reducing it to a stylistic label.` : 'This entry is a starting point for investigating its works, agents and historical contexts.'}\n\n## How to continue\n\nThe catalogue connections should be compared with historical sources, while attending to the movement’s internal, chronological and geographical differences.`,
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
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.enTitle : r.title)},${q(r['summary_' + locale])},${q(r['essay_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","essay"=EXCLUDED."essay","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-movements-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_MOVEMENTS_001', selection: '20 published movements missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_MOVEMENTS_001: updated ${out.length} movements with bilingual editorial fields transactionally.`,
);
