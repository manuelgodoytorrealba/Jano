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
  originalidad: [
    'La originalidad atribuye valor a la novedad y a la diferencia, pero también depende de normas históricas sobre autoría y reconocimiento.',
    'Originality assigns value to novelty and difference, while also depending on historical norms of authorship and recognition.',
  ],
  ornamento: [
    'El ornamento añade ritmo, detalle y significado a una superficie u objeto, y puede ser central o rechazado según cada tradición.',
    'Ornament adds rhythm, detail and meaning to a surface or object and can be central or rejected according to each tradition.',
  ],
  oro: [
    'El oro combina valor material, brillo, permanencia y simbolismo en objetos artísticos, rituales y de poder.',
    'Gold combines material value, brilliance, durability and symbolism in artistic, ritual and power objects.',
  ],
  paisaje: [
    'El paisaje representa y organiza un entorno, articulando naturaleza, territorio, mirada, memoria y actividad humana.',
    'Landscape represents and organises an environment, articulating nature, territory, gaze, memory and human activity.',
  ],
  'paisaje-rural': [
    'El paisaje rural representa espacios agrícolas y comunidades no urbanas, y hace visibles relaciones entre trabajo, territorio y naturaleza.',
    'Rural landscape represents agricultural and non-urban spaces and makes relations among labour, territory and nature visible.',
  ],
  'paisaje-urbano': [
    'El paisaje urbano representa la ciudad mediante arquitectura, circulación, infraestructura y formas de vida compartida.',
    'Urban landscape represents the city through architecture, circulation, infrastructure and shared forms of life.',
  ],
  papel: [
    'El papel es un soporte ligero y versátil para escritura, dibujo, impresión, collage y experimentación material.',
    'Paper is a light and versatile support for writing, drawing, printing, collage and material experimentation.',
  ],
  participacion: [
    'La participación incorpora la acción, decisión o presencia del público como parte constitutiva de una práctica artística.',
    'Participation incorporates the audience’s action, decision or presence as a constitutive part of an artistic practice.',
  ],
  patrimonio: [
    'El patrimonio reúne bienes, prácticas y memorias considerados valiosos para una comunidad, y siempre implica decisiones de conservación y acceso.',
    'Heritage brings together goods, practices and memories considered valuable to a community and always involves decisions about preservation and access.',
  ],
  'patrimonio-inmaterial': [
    'El patrimonio inmaterial comprende saberes, rituales, lenguas y prácticas vivas transmitidas y transformadas por las comunidades.',
    'Intangible heritage comprises knowledge, rituals, languages and living practices transmitted and transformed by communities.',
  ],
  'pelicula-fotografica': [
    'La película fotográfica registra imágenes mediante una emulsión sensible a la luz y conserva una relación material con el proceso fotográfico.',
    'Photographic film records images through a light-sensitive emulsion and preserves a material relation to the photographic process.',
  ],
  performance: [
    'La performance utiliza presencia, acción, duración y contexto para producir una experiencia artística que puede ser irrepetible.',
    'Performance uses presence, action, duration and context to produce an artistic experience that may be unrepeatable.',
  ],
  perspectiva: [
    'La perspectiva organiza la representación del espacio y la posición del observador mediante reglas, convenciones y efectos de profundidad.',
    'Perspective organises the representation of space and the observer’s position through rules, conventions and effects of depth.',
  ],
  'perspectiva-aerea': [
    'La perspectiva aérea representa profundidad mediante variaciones de nitidez, tono y color asociadas a la distancia y la atmósfera.',
    'Aerial perspective represents depth through variations in sharpness, tone and colour associated with distance and atmosphere.',
  ],
  'perspectiva-lineal': [
    'La perspectiva lineal construye profundidad mediante líneas convergentes y un punto de vista geométricamente organizado.',
    'Linear perspective constructs depth through converging lines and a geometrically organised point of view.',
  ],
  pigmento: [
    'El pigmento aporta color a una superficie y relaciona materia, técnica, percepción y conservación.',
    'Pigment provides colour to a surface and connects matter, technique, perception and conservation.',
  ],
  'pintura-al-oleo': [
    'La pintura al óleo mezcla pigmentos con aceite y permite capas, transparencias, textura y tiempos prolongados de trabajo.',
    'Oil painting mixes pigments with oil and allows layers, transparencies, texture and extended working times.',
  ],
  'pintura-de-historia': [
    'La pintura de historia representa acontecimientos, mitos y figuras ejemplares para construir relatos públicos sobre el pasado.',
    'History painting represents events, myths and exemplary figures to construct public narratives about the past.',
  ],
  'pintura-religiosa': [
    'La pintura religiosa representa relatos, figuras y prácticas de fe, y articula imagen, devoción, ritual e institución.',
    'Religious painting represents stories, figures and practices of faith and articulates image, devotion, ritual and institution.',
  ],
  planta: [
    'La planta organiza la forma de una construcción o representa un organismo vegetal, relacionando espacio, crecimiento, estructura y vida.',
    'A plan organises the form of a building or represents a plant organism, relating space, growth, structure and life.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-017.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_017', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_017: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
