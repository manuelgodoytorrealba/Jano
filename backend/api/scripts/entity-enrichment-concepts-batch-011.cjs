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
  abstraccion: [
    'La abstracción organiza la imagen mediante formas, colores, relaciones espaciales o gestos que no dependen de representar objetos reconocibles.',
    'Abstraction organises the image through forms, colours, spatial relations or gestures that do not depend on depicting recognisable objects.',
  ],
  academia: [
    'La academia reúne instituciones, normas y prácticas de enseñanza que han definido qué saberes, técnicas y modelos se consideran legítimos en el arte.',
    'The academy brings together institutions, norms and teaching practices that have shaped which forms of knowledge, techniques and models are treated as legitimate in art.',
  ],
  accesibilidad: [
    'La accesibilidad aborda las condiciones que permiten que distintas personas puedan acercarse, comprender y participar en la experiencia artística y cultural.',
    'Accessibility concerns the conditions that allow different people to approach, understand and participate in artistic and cultural experiences.',
  ],
  acero: [
    'El acero es un material industrial cuya resistencia, fabricación y apariencia han ampliado las posibilidades de la arquitectura, la escultura y el diseño.',
    'Steel is an industrial material whose strength, production and appearance have expanded the possibilities of architecture, sculpture and design.',
  ],
  activismo: [
    'El activismo vincula la práctica artística con la intervención pública, la denuncia, la organización colectiva y la transformación de condiciones sociales.',
    'Activism connects artistic practice with public intervention, protest, collective organisation and the transformation of social conditions.',
  ],
  acuarela: [
    'La acuarela utiliza pigmentos diluidos en agua y aprovecha la transparencia, la fluidez y la reserva del soporte como parte de la imagen.',
    'Watercolour uses pigments diluted in water and makes transparency, fluidity and the reserve of the support part of the image.',
  ],
  agua: [
    'El agua puede funcionar en el arte como materia, imagen, recurso, paisaje y condición política vinculada a la vida y al territorio.',
    'Water can function in art as material, image, resource, landscape and political condition connected to life and territory.',
  ],
  aguafuerte: [
    'El aguafuerte es una técnica de grabado en la que un ácido muerde las líneas dibujadas sobre una plancha metálica protegida.',
    'Etching is a printmaking technique in which acid bites lines drawn on a protected metal plate.',
  ],
  'agua-politica': [
    'Agua y política examina el agua como recurso disputado y como espacio de desigualdad, cuidado, memoria y decisión colectiva.',
    'Water and politics examines water as a contested resource and as a space of inequality, care, memory and collective decision-making.',
  ],
  aire: [
    'El aire aparece en el arte como elemento invisible, atmósfera, volumen, medio de circulación y condición material de la percepción.',
    'Air appears in art as an invisible element, atmosphere, volume, medium of circulation and material condition of perception.',
  ],
  alegoria: [
    'La alegoría comunica ideas abstractas mediante figuras, acciones, objetos o escenas que adquieren un significado adicional al literal.',
    'Allegory communicates abstract ideas through figures, actions, objects or scenes that acquire a meaning beyond the literal one.',
  ],
  animal: [
    'El animal puede ser representado como sujeto, símbolo, compañero, recurso o agente, y permite revisar las relaciones entre humanidad, naturaleza y cultura.',
    'The animal can be represented as subject, symbol, companion, resource or agent, opening questions about relations between humanity, nature and culture.',
  ],
  archivo: [
    'El archivo reúne documentos y sistemas de clasificación que conservan, ordenan y también condicionan la memoria histórica y cultural.',
    'The archive brings together documents and systems of classification that preserve, organise and also shape historical and cultural memory.',
  ],
  'archivo-vivo': [
    'El archivo vivo entiende la memoria como una práctica activa que puede reordenar, activar y discutir los documentos heredados.',
    'The living archive understands memory as an active practice that can reorder, activate and question inherited documents.',
  ],
  arquitectura: [
    'La arquitectura organiza espacios habitables mediante estructura, materia, función, circulación y relación con un contexto social y territorial.',
    'Architecture organises inhabitable spaces through structure, material, function, circulation and relation to a social and territorial context.',
  ],
  'arquitectura-domestica': [
    'La arquitectura doméstica estudia los espacios de la vida cotidiana y cómo sus formas regulan intimidad, convivencia, trabajo y cuidado.',
    'Domestic architecture studies spaces of everyday life and how their forms regulate intimacy, cohabitation, work and care.',
  ],
  artesania: [
    'La artesanía reúne saberes materiales, técnicas transmitidas y formas de trabajo en las que la fabricación participa del significado del objeto.',
    'Craft brings together material knowledge, transmitted techniques and forms of work in which making participates in the object’s meaning.',
  ],
  autoria: [
    'La autoría designa las formas de atribuir una obra a una persona, colectivo, institución o proceso, y sus implicaciones de responsabilidad y poder.',
    'Authorship describes the ways a work is attributed to a person, collective, institution or process, with implications for responsibility and power.',
  ],
  autorretrato: [
    'El autorretrato utiliza la propia imagen del artista para explorar identidad, representación, memoria, presencia y construcción de un personaje.',
    'Self-portraiture uses the artist’s own image to explore identity, representation, memory, presence and the construction of a persona.',
  ],
  belleza: [
    'La belleza es una categoría histórica y cultural para valorar formas, experiencias y relaciones sensibles, siempre abierta a disputa y transformación.',
    'Beauty is a historical and cultural category for valuing forms, experiences and sensory relations, always open to dispute and transformation.',
  ],
};
const slugs = Object.keys(copy);
const slugsSql = slugs.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugsSql}) AND e.type='CONCEPT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published concepts, got ${rows.length}`);

const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
const essays = (r, es, en) => ({
  es: `## Definición\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${natural(r.related.slice(0, 8))}. Estas conexiones permiten observar cómo el concepto cambia al pasar entre obras, artistas, movimientos y contextos.` : 'El concepto funciona aquí como una entrada interpretativa abierta, sin reducirse a una definición única.'}\n\n## Cómo continuar\n\nLa exploración debe seguir las entidades y fuentes conectadas. Las interpretaciones más específicas requieren evidencia atribuible y no deben deducirse únicamente del término.`,
  en: `## Definition\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths show how the concept changes across works, artists, movements and contexts.` : 'The concept functions here as an open interpretive entry rather than a single fixed definition.'}\n\n## How to continue\n\nContinue through the connected entities and sources. More specific interpretations require attributable evidence and should not be inferred from the term alone.`,
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
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.title : r.title)},${q(r['summary_' + locale])},${q(r['essay_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","essay"=EXCLUDED."essay","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-011.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_011', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_011: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
