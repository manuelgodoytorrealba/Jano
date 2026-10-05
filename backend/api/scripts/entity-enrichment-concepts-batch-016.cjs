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
  '_draft-b358f61f-dce5-489e-8b19-d143ef7f57aa': [
    'La maternidad aborda experiencias de gestación, cuidado, vínculo y representación, atravesadas por relaciones de género y poder.',
    'Motherhood addresses experiences of gestation, care, attachment and representation, shaped by relations of gender and power.',
  ],
  'medios-de-masas': [
    'Los medios de masas producen y distribuyen imágenes para públicos amplios, transformando atención, opinión y cultura visual.',
    'Mass media produce and distribute images for broad publics, transforming attention, opinion and visual culture.',
  ],
  melancolia: [
    'La melancolía articula pérdida, contemplación y tiempo suspendido, y puede convertirse en una forma de sensibilidad visual.',
    'Melancholy articulates loss, contemplation and suspended time and can become a form of visual sensibility.',
  ],
  memoria: [
    'La memoria conserva, reconstruye y disputa experiencias individuales y colectivas a través de imágenes, objetos y relatos.',
    'Memory preserves, reconstructs and contests individual and collective experiences through images, objects and narratives.',
  ],
  'mercado-del-arte': [
    'El mercado del arte organiza la circulación económica y simbólica de obras, autores, instituciones y formas de valor.',
    'The art market organises the economic and symbolic circulation of works, authors, institutions and forms of value.',
  ],
  migracion: [
    'La migración implica desplazamiento entre territorios y transforma pertenencias, memorias, lenguas y representaciones.',
    'Migration involves movement between territories and transforms belonging, memories, languages and representations.',
  ],
  mirada: [
    'La mirada es una relación situada entre quien observa, aquello que se muestra y las condiciones sociales que organizan la visibilidad.',
    'The gaze is a situated relation among the observer, what is shown and the social conditions that organise visibility.',
  ],
  mito: [
    'El mito transmite relatos fundacionales y figuras ejemplares que pueden ser reinterpretados por imágenes, rituales y narraciones.',
    'Myth transmits foundational stories and exemplary figures that can be reinterpreted through images, rituals and narratives.',
  ],
  moda: [
    'La moda organiza cuerpos, prendas y apariencias mediante ciclos de innovación, imitación, distinción y pertenencia.',
    'Fashion organises bodies, garments and appearances through cycles of innovation, imitation, distinction and belonging.',
  ],
  modernidad: [
    'La modernidad nombra transformaciones asociadas a industria, urbanización, velocidad, secularización y nuevas experiencias del tiempo.',
    'Modernity names transformations associated with industry, urbanisation, speed, secularisation and new experiences of time.',
  ],
  monstruo: [
    'El monstruo representa aquello que desborda normas corporales, sociales o naturales y permite hacer visible el miedo y la alteridad.',
    'The monster represents what exceeds bodily, social or natural norms and makes fear and otherness visible.',
  ],
  monumento: [
    'El monumento materializa memoria pública y valores colectivos, pero también puede fijar conflictos sobre historia, poder y espacio.',
    'The monument materialises public memory and collective values, while also fixing conflicts about history, power and space.',
  ],
  muerte: [
    'La muerte aparece como límite, ausencia y transformación, y activa prácticas de memoria, duelo y representación.',
    'Death appears as limit, absence and transformation and activates practices of memory, mourning and representation.',
  ],
  mural: [
    'El mural integra imagen y arquitectura en una superficie pública, vinculando escala, comunidad, pedagogía y memoria.',
    'The mural integrates image and architecture on a public surface, linking scale, community, pedagogy and memory.',
  ],
  museo: [
    'El museo conserva, clasifica y muestra objetos, y produce marcos institucionales para su interpretación y valor.',
    'The museum preserves, classifies and displays objects and produces institutional frames for their interpretation and value.',
  ],
  museologia: [
    'La museología estudia las instituciones, métodos y políticas que organizan colecciones, exposiciones y relaciones con públicos.',
    'Museology studies the institutions, methods and policies that organise collections, exhibitions and relations with publics.',
  ],
  musica: [
    'La música organiza sonido, ritmo, silencio y escucha, y puede relacionarse con imagen, cuerpo, espacio y memoria.',
    'Music organises sound, rhythm, silence and listening and can relate to image, body, space and memory.',
  ],
  nacion: [
    'La nación construye una comunidad política e imaginada mediante territorio, símbolos, relatos históricos y formas de pertenencia.',
    'The nation constructs a political and imagined community through territory, symbols, historical narratives and forms of belonging.',
  ],
  naturaleza: [
    'La naturaleza designa tanto el mundo no humano como una idea cultural que el arte representa, ordena y transforma.',
    'Nature describes both the non-human world and a cultural idea that art represents, organises and transforms.',
  ],
  'naturaleza-muerta': [
    'La naturaleza muerta representa objetos inanimados y convierte su disposición en una reflexión sobre tiempo, materia, consumo y ausencia.',
    'Still life represents inanimate objects and turns their arrangement into a reflection on time, matter, consumption and absence.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-016.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_016', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_016: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
