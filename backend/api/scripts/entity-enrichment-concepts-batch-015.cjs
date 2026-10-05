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
  identidad: [
    'La identidad reúne rasgos, memorias y posiciones desde las que una persona o comunidad se reconoce y es representada.',
    'Identity brings together traits, memories and positions through which a person or community recognises itself and is represented.',
  ],
  imperio: [
    'El imperio organiza poder territorial, administración y circulación cultural mediante relaciones de conquista y dependencia.',
    'Empire organises territorial power, administration and cultural circulation through relations of conquest and dependence.',
  ],
  inconsciente: [
    'El inconsciente señala dimensiones no plenamente conscientes del deseo, la memoria y la experiencia que pueden aparecer en las imágenes.',
    'The unconscious points to dimensions of desire, memory and experience that are not fully conscious and can appear in images.',
  ],
  industria: [
    'La industria transforma materiales, trabajo y producción, y modifica la relación entre arte, técnica, mercado y vida cotidiana.',
    'Industry transforms materials, labour and production and changes the relation between art, technology, markets and everyday life.',
  ],
  instalacion: [
    'La instalación configura un entorno mediante objetos, imágenes, sonidos y recorridos que implican corporalmente al público.',
    'Installation configures an environment through objects, images, sounds and paths that involve audiences bodily.',
  ],
  'inteligencia-artificial': [
    'La inteligencia artificial utiliza sistemas computacionales capaces de producir, clasificar o transformar datos y abre debates sobre autoría, trabajo y decisión.',
    'Artificial intelligence uses computational systems able to produce, classify or transform data and raises debates about authorship, labour and decision.',
  ],
  interactividad: [
    'La interactividad permite que las acciones del público modifiquen una obra, un sistema o la secuencia de una experiencia.',
    'Interactivity allows audience actions to modify a work, a system or the sequence of an experience.',
  ],
  joyeria: [
    'La joyería trabaja objetos destinados al cuerpo y articula adorno, materialidad, estatus, técnica y significado simbólico.',
    'Jewellery works with objects intended for the body and articulates adornment, materiality, status, technique and symbolic meaning.',
  ],
  juventud: [
    'La juventud es una categoría social y cultural asociada a transición, energía, vulnerabilidad y formas de imaginar el futuro.',
    'Youth is a social and cultural category associated with transition, energy, vulnerability and ways of imagining the future.',
  ],
  lenguaje: [
    'El lenguaje organiza la comunicación mediante signos, reglas y usos que también pueden convertirse en material artístico.',
    'Language organises communication through signs, rules and uses that can also become artistic material.',
  ],
  lienzo: [
    'El lienzo es un soporte flexible para la pintura cuya superficie y materialidad forman parte de la historia de la obra.',
    'Canvas is a flexible support for painting whose surface and materiality form part of a work’s history.',
  ],
  linea: [
    'La línea marca recorridos, contornos y direcciones, y puede funcionar como dibujo, estructura, gesto o límite.',
    'The line marks paths, contours and directions and can function as drawing, structure, gesture or boundary.',
  ],
  litografia: [
    'La litografía imprime a partir de la repulsión entre agua y grasa sobre una piedra o plancha, facilitando la reproducción de imágenes.',
    'Lithography prints through the repulsion of water and grease on stone or plate, facilitating the reproduction of images.',
  ],
  lujo: [
    'El lujo reúne objetos, materiales y prácticas de exclusividad que hacen visible la riqueza, el poder y la distinción social.',
    'Luxury brings together objects, materials and practices of exclusivity that make wealth, power and social distinction visible.',
  ],
  luz: [
    'La luz hace visible la imagen y puede actuar como materia, símbolo, atmósfera y dispositivo para dirigir la mirada.',
    'Light makes the image visible and can act as material, symbol, atmosphere and device for directing the gaze.',
  ],
  madera: [
    'La madera es un material orgánico trabajado mediante talla, ensamblaje y construcción, con una relación particular con el tiempo y el territorio.',
    'Wood is an organic material worked through carving, assemblage and construction, with a particular relation to time and territory.',
  ],
  manuscrito: [
    'El manuscrito es un documento escrito o ilustrado cuya materialidad conserva huellas de producción, circulación y lectura.',
    'A manuscript is a written or illustrated document whose materiality preserves traces of production, circulation and reading.',
  ],
  maquina: [
    'La máquina articula energía, movimiento y trabajo, y funciona como herramienta, imagen de modernidad o modelo de organización social.',
    'The machine articulates energy, movement and labour and functions as tool, image of modernity or model of social organisation.',
  ],
  marmol: [
    'El mármol es una piedra trabajada en arquitectura y escultura, asociada a duración, monumento, pulimento y extracción material.',
    'Marble is a stone worked in architecture and sculpture and associated with durability, monument, polish and material extraction.',
  ],
  materialidad: [
    'La materialidad atiende a las propiedades, resistencias, huellas y condiciones de los materiales que participan en una obra.',
    'Materiality attends to the properties, resistances, traces and conditions of the materials that participate in a work.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-015.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_015', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_015: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
