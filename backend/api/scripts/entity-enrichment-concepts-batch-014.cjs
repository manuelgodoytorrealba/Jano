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
  exilio: [
    'El exilio describe una experiencia de desplazamiento forzado que transforma identidad, memoria, lengua y relación con el lugar.',
    'Exile describes an experience of forced displacement that transforms identity, memory, language and relation to place.',
  ],
  exposicion: [
    'La exposición organiza obras, objetos y públicos en un espacio y un recorrido que producen formas de atención y significado.',
    'An exhibition organises works, objects and publics in a space and route that produce forms of attention and meaning.',
  ],
  feminismo: [
    'El feminismo analiza las relaciones de género y poder y sostiene prácticas que cuestionan desigualdades en la cultura y la sociedad.',
    'Feminism analyses relations of gender and power and supports practices that question inequalities in culture and society.',
  ],
  folclore: [
    'El folclore reúne relatos, imágenes, músicas y prácticas atribuidas a una comunidad, siempre atravesadas por selección y representación.',
    'Folklore brings together stories, images, music and practices attributed to a community, always shaped by selection and representation.',
  ],
  forma: [
    'La forma organiza la apariencia y estructura de una obra, pero también puede producir significado, ritmo, tensión y experiencia corporal.',
    'Form organises a work’s appearance and structure, while also producing meaning, rhythm, tension and bodily experience.',
  ],
  fotografia: [
    'La fotografía fija la luz en una imagen y articula registro, memoria, encuadre, ficción y circulación pública.',
    'Photography fixes light in an image and articulates record, memory, framing, fiction and public circulation.',
  ],
  fragmento: [
    'El fragmento presenta una parte incompleta como huella, resto o estrategia para activar asociaciones y lecturas abiertas.',
    'The fragment presents an incomplete part as trace, remainder or strategy for activating open associations and readings.',
  ],
  fresco: [
    'El fresco aplica pigmento sobre una superficie de yeso húmedo y vincula imagen, arquitectura, tiempo de ejecución y permanencia.',
    'Fresco applies pigment to wet plaster and links image, architecture, time of execution and durability.',
  ],
  frontera: [
    'La frontera separa y conecta territorios, identidades y sistemas, y puede funcionar como línea, espacio de tránsito o conflicto.',
    'A border separates and connects territories, identities and systems and can function as line, transit space or conflict.',
  ],
  'frontera-colonial': [
    'La frontera colonial organiza territorios y poblaciones mediante relaciones de conquista, clasificación y desigualdad.',
    'The colonial frontier organises territories and populations through relations of conquest, classification and inequality.',
  ],
  fuego: [
    'El fuego es materia, energía e imagen de transformación, destrucción, ritual y producción técnica.',
    'Fire is matter, energy and an image of transformation, destruction, ritual and technical production.',
  ],
  fundicion: [
    'La fundición transforma materiales mediante calor y permite producir formas, copias, herramientas y esculturas.',
    'Casting transforms materials through heat and makes it possible to produce forms, copies, tools and sculptures.',
  ],
  genero: [
    'El género organiza expectativas y relaciones sociales sobre cuerpos, identidades y roles, y también condiciona su representación.',
    'Gender organises social expectations and relations around bodies, identities and roles, and also shapes their representation.',
  ],
  globalizacion: [
    'La globalización intensifica circulaciones de personas, imágenes, mercancías e información, junto con nuevas desigualdades y dependencias.',
    'Globalisation intensifies the circulation of people, images, goods and information, together with new inequalities and dependencies.',
  ],
  grabado: [
    'El grabado produce imágenes mediante una matriz y permite reproducirlas, distribuirlas y transformar su relación con el original.',
    'Printmaking produces images through a matrix and makes it possible to reproduce, distribute and transform their relation to the original.',
  ],
  guerra: [
    'La guerra altera territorios, cuerpos, memorias y sistemas de representación, y convierte las imágenes en testimonios, propaganda o resistencia.',
    'War transforms territories, bodies, memories and systems of representation, turning images into testimony, propaganda or resistance.',
  ],
  hormigon: [
    'El hormigón es un material constructivo que articula masa, estructura, superficie e infraestructura en la arquitectura y la escultura.',
    'Concrete is a building material that articulates mass, structure, surface and infrastructure in architecture and sculpture.',
  ],
  huella: [
    'La huella es una marca producida por contacto, paso o inscripción, y permite pensar la presencia a través de su rastro.',
    'A trace is a mark produced by contact, passage or inscription, making presence legible through its remainder.',
  ],
  icono: [
    'El icono es una imagen o signo investido de reconocimiento, valor simbólico o función de presencia.',
    'An icon is an image or sign invested with recognition, symbolic value or a function of presence.',
  ],
  iconografia: [
    'La iconografía estudia los temas, atributos y motivos reconocibles que permiten interpretar imágenes dentro de una tradición.',
    'Iconography studies recognisable themes, attributes and motifs that allow images to be interpreted within a tradition.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-014.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_014', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_014: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
