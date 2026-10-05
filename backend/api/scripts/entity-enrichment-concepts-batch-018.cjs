const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
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
  poder: [
    'El poder distribuye capacidades de decisión, visibilidad y control, y atraviesa instituciones, cuerpos, espacios e imágenes.',
    'Power distributes capacities for decision, visibility and control and runs through institutions, bodies, spaces and images.',
  ],
  poesia: [
    'La poesía organiza lenguaje, ritmo, imagen y voz para producir formas condensadas de experiencia y pensamiento.',
    'Poetry organises language, rhythm, image and voice to produce condensed forms of experience and thought.',
  ],
  posmodernidad: [
    'La posmodernidad cuestiona relatos universales y jerarquías estables, y atiende a la mezcla, la cita, los medios y la pluralidad.',
    'Postmodernity questions universal narratives and stable hierarchies and attends to mixture, quotation, media and plurality.',
  ],
  'primera-revolucion-industrial': [
    'La Primera Revolución Industrial transformó producción, energía, trabajo, ciudades y relaciones sociales mediante la mecanización.',
    'The First Industrial Revolution transformed production, energy, labour, cities and social relations through mechanisation.',
  ],
  profano: [
    'Lo profano designa aquello situado fuera de lo sagrado y permite estudiar tensiones entre ritual, institución, vida cotidiana y secularización.',
    'The profane describes what lies outside the sacred and allows tensions among ritual, institution, everyday life and secularisation to be studied.',
  ],
  propaganda: [
    'La propaganda produce y distribuye mensajes destinados a orientar opiniones y conductas, especialmente en contextos de conflicto y poder.',
    'Propaganda produces and distributes messages intended to shape opinions and behaviour, especially in contexts of conflict and power.',
  ],
  propiedad: [
    'La propiedad regula la posesión y control de objetos, tierras, imágenes y recursos, con consecuencias económicas y políticas.',
    'Property regulates the possession and control of objects, land, images and resources, with economic and political consequences.',
  ],
  proporcion: [
    'La proporción relaciona partes y totalidad mediante medidas y correspondencias que pueden organizar cuerpos, edificios e imágenes.',
    'Proportion relates parts and wholes through measures and correspondences that can organise bodies, buildings and images.',
  ],
  publicidad: [
    'La publicidad combina imagen, texto y deseo para promover bienes, identidades y estilos de vida dentro de una economía de atención.',
    'Advertising combines image, text and desire to promote goods, identities and lifestyles within an economy of attention.',
  ],
  pueblo: [
    'El pueblo nombra una comunidad política y cultural, pero también una figura representada y construida por relatos, símbolos y conflictos.',
    'The people names a political and cultural community, while also being a figure represented and constructed through narratives, symbols and conflicts.',
  ],
  queer: [
    'Lo queer cuestiona normas fijas de género, sexualidad e identidad y abre formas de vida, representación y relación no normativas.',
    'Queer questions fixed norms of gender, sexuality and identity and opens non-normative forms of life, representation and relation.',
  ],
  raza: [
    'La raza es una construcción histórica que ha clasificado cuerpos y poblaciones, produciendo jerarquías y formas persistentes de representación.',
    'Race is a historical construction that has classified bodies and populations, producing hierarchies and persistent forms of representation.',
  ],
  'realidad-virtual': [
    'La realidad virtual produce entornos inmersivos mediante tecnologías digitales y modifica las relaciones entre cuerpo, espacio e imagen.',
    'Virtual reality produces immersive environments through digital technologies and changes relations among body, space and image.',
  ],
  red: [
    'La red conecta personas, datos, imágenes y dispositivos, y transforma circulación, colaboración, vigilancia y acceso.',
    'The network connects people, data, images and devices and transforms circulation, collaboration, surveillance and access.',
  ],
  religion: [
    'La religión articula creencias, rituales, instituciones e imágenes que organizan relaciones con lo sagrado y la comunidad.',
    'Religion articulates beliefs, rituals, institutions and images that organise relations with the sacred and community.',
  ],
  repatriacion: [
    'La repatriación devuelve objetos, restos o bienes culturales a sus comunidades o territorios de origen y cuestiona historias de extracción.',
    'Repatriation returns objects, remains or cultural goods to their communities or territories of origin and questions histories of extraction.',
  ],
  representacion: [
    'La representación hace presente algo ausente mediante imágenes, signos, relatos y convenciones, y nunca es neutral.',
    'Representation makes something absent present through images, signs, narratives and conventions and is never neutral.',
  ],
  reproduccion: [
    'La reproducción permite repetir y distribuir imágenes u objetos, modificando su aura, alcance, valor y relación con el original.',
    'Reproduction allows images or objects to be repeated and distributed, changing their aura, reach, value and relation to the original.',
  ],
  restauracion: [
    'La restauración interviene obras dañadas para estabilizarlas o devolverles legibilidad, negociando historia material, apariencia y cambio.',
    'Restoration intervenes in damaged works to stabilise them or restore legibility, negotiating material history, appearance and change.',
  ],
  restitucion: [
    'La restitución devuelve bienes, tierras o derechos y confronta historias de despojo, violencia, propiedad y reparación.',
    'Restitution returns goods, land or rights and confronts histories of dispossession, violence, property and repair.',
  ],
};
const slugs = Object.keys(copy),
  slugsSql = slugs.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugsSql}) AND e.type='CONCEPT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published concepts, got ${rows.length}`);
const out = rows.map((r) => {
  const [es, en] = copy[r.slug];
  const re = r.related.length
    ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}.`
    : 'El concepto funciona como una entrada interpretativa abierta.';
  const rn = r.related.length
    ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}.`
    : 'The concept functions as an open interpretive entry.';
  return {
    ...r,
    summary_es: es,
    summary_en: en,
    essay_es: `## Definición\n\n${es}\n\n## Relaciones de lectura\n\n${re}\n\n## Cómo continuar\n\nLa exploración debe seguir las entidades y fuentes conectadas; las interpretaciones específicas requieren evidencia atribuible.`,
    essay_en: `## Definition\n\n${en}\n\n## Reading relationships\n\n${rn}\n\n## How to continue\n\nContinue through the connected entities and sources; specific interpretations require attributable evidence.`,
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-018.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_018', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_018: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
