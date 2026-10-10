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
  'academie-des-beaux-arts': [
    'La Académie des Beaux-Arts es una institución francesa de formación, legitimación y conservación artística, vinculada a academias, concursos y redes de mecenazgo.',
    'The Académie des Beaux-Arts is a French institution of artistic training, legitimation and conservation, connected to academies, competitions and patronage networks.',
  ],
  'bauhaus-school': [
    'La Escuela Bauhaus fue una institución experimental que integró arte, artesanía, diseño, arquitectura e industria mediante talleres y pedagogías modernas.',
    'The Bauhaus School was an experimental institution integrating art, craft, design, architecture and industry through workshops and modern pedagogies.',
  ],
  'escuela-de-atenas-institucion': [
    'La Escuela de Atenas es una institución cultural y educativa dedicada a la investigación, difusión y conservación de saberes relacionados con la tradición clásica.',
    'The School of Athens is a cultural and educational institution devoted to researching, disseminating and preserving knowledge related to the classical tradition.',
  ],
  'instituto-de-arte-chicago': [
    'El Instituto de Arte de Chicago es un museo y centro educativo con colecciones amplias de arte y programas de investigación, exposición y formación.',
    'The Art Institute of Chicago is a museum and educational centre with broad art collections and programmes of research, exhibition and teaching.',
  ],
  'instituto-warburg': [
    'El Instituto Warburg es un centro de investigación dedicado a la historia cultural de las imágenes, la memoria y la circulación de motivos entre épocas y geografías.',
    'The Warburg Institute is a research centre devoted to the cultural history of images, memory and the circulation of motifs across periods and geographies.',
  ],
  louvre: [
    'El Museo del Louvre es una institución museística de alcance internacional cuyas colecciones recorren múltiples culturas, periodos y medios artísticos.',
    'The Louvre Museum is an international museum whose collections span multiple cultures, periods and artistic media.',
  ],
  'metropolitan-museum': [
    'El Metropolitan Museum of Art es una institución enciclopédica dedicada a coleccionar, conservar, investigar y exhibir obras de numerosas culturas y épocas.',
    'The Metropolitan Museum of Art is an encyclopaedic institution devoted to collecting, preserving, researching and exhibiting works from many cultures and periods.',
  ],
  moma: [
    'El Museo de Arte Moderno de Nueva York ha sido decisivo en la colección, exposición y construcción historiográfica del arte moderno y contemporáneo.',
    'The Museum of Modern Art in New York has been decisive in collecting, exhibiting and shaping the historiography of modern and contemporary art.',
  ],
  'museo-britanico': [
    'El Museo Británico conserva colecciones de alcance mundial y plantea debates sobre clasificación, patrimonio, colonialismo y circulación de objetos.',
    'The British Museum holds collections of global scope and raises debates about classification, heritage, colonialism and the circulation of objects.',
  ],
  'museo-del-prado': [
    'El Museo del Prado es una institución central para estudiar las colecciones reales españolas, la pintura europea y las políticas modernas de conservación y exhibición.',
    'The Prado Museum is central to studying Spanish royal collections, European painting and modern policies of conservation and exhibition.',
  ],
  'museo-egipcio-cairo': [
    'El Museo Egipcio de El Cairo reúne piezas fundamentales para investigar la cultura material, escritura, ritual y arte del antiguo Egipto.',
    'The Egyptian Museum in Cairo holds key objects for researching the material culture, writing, ritual and art of ancient Egypt.',
  ],
  'museo-nacional-antropologia': [
    'El Museo Nacional de Antropología de México conserva y presenta patrimonio de pueblos originarios, articulando investigación, educación y debates sobre representación.',
    'Mexico’s National Museum of Anthropology preserves and presents Indigenous heritage, bringing together research, education and debates about representation.',
  ],
  'museo-nacional-de-arte-mexico': [
    'El Museo Nacional de Arte reúne obras y discursos sobre la historia del arte en México, desde tradiciones virreinales hasta modernidad y contemporaneidad.',
    'Mexico’s National Museum of Art brings together works and narratives about Mexican art history, from viceregal traditions to modern and contemporary practice.',
  ],
  'museo-reina-sofia': [
    'El Museo Reina Sofía es una institución de arte moderno y contemporáneo centrada en investigación, memoria, vanguardias y prácticas críticas.',
    'The Reina Sofía Museum is a modern and contemporary art institution focused on research, memory, avant-gardes and critical practices.',
  ],
  'national-gallery-london': [
    'La National Gallery de Londres conserva una colección de pintura europea y desarrolla programas de investigación, educación y exposición pública.',
    'London’s National Gallery holds a collection of European painting and develops programmes of research, education and public exhibition.',
  ],
  'tate-modern': [
    'Tate Modern es una institución internacional dedicada al arte moderno y contemporáneo, con exposiciones que conectan historias globales y prácticas experimentales.',
    'Tate Modern is an international institution devoted to modern and contemporary art, with exhibitions connecting global histories and experimental practices.',
  ],
  uffizi: [
    'La Galería Uffizi conserva colecciones fundamentales del Renacimiento italiano y permite estudiar relaciones entre mecenazgo, corte, imagen y patrimonio.',
    'The Uffizi Gallery holds foundational collections of the Italian Renaissance and enables study of patronage, court culture, image and heritage.',
  ],
  '_wave002-2534f70b1aff5898': [
    'Black Mountain College Museum + Arts Center documenta y difunde la historia experimental del Black Mountain College y sus redes de arte, educación y colaboración.',
    'Black Mountain College Museum + Arts Center documents and shares the experimental history of Black Mountain College and its networks of art, education and collaboration.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='ORGANIZATION' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published organizations, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar la institución a través de sus colecciones, lugares, artistas y marcos históricos.` : 'La entrada funciona como un punto de partida para investigar su historia, misión y prácticas institucionales.'}\n\n## Cómo continuar\n\nConviene distinguir entre la misión declarada, las colecciones y las políticas concretas de investigación, conservación, exposición y representación.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the institution to be studied through its collections, places, artists and historical frameworks.` : 'This entry is a starting point for investigating its history, mission and institutional practices.'}\n\n## How to continue\n\nDistinguish between the stated mission, collections and the concrete policies of research, conservation, exhibition and representation.`,
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
  'artifacts/editorial-recovery/entity-enrichment-organizations-batch-077.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_ORGANIZATIONS_077', selection: '18 published organizations missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_ORGANIZATIONS_077: updated ${out.length} organizations with bilingual base editorial fields transactionally.`,
);
