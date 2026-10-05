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
  teatro: [
    'El teatro combina cuerpos, voz, espacio, tiempo y espectadores para producir una situación escénica compartida.',
    'Theatre combines bodies, voice, space, time and spectators to produce a shared scenic situation.',
  ],
  'tecnicas-de-reproduccion': [
    'Las técnicas de reproducción permiten copiar y distribuir imágenes u objetos, transformando su alcance, valor y relación con el original.',
    'Reproduction techniques allow images or objects to be copied and distributed, changing their reach, value and relation to the original.',
  ],
  tecnologia: [
    'La tecnología reúne herramientas, conocimientos y sistemas que median la producción artística y las formas de vida.',
    'Technology brings together tools, knowledge and systems that mediate artistic production and forms of life.',
  ],
  temple: [
    'La témpera mezcla pigmentos con un aglutinante acuoso y permite una aplicación controlada, mate y durable sobre distintos soportes.',
    'Tempera mixes pigments with a water-based binder and allows a controlled, matte and durable application on different supports.',
  ],
  tenebrismo: [
    'El tenebrismo intensifica el contraste entre oscuridad y luz para concentrar la atención y producir dramatismo.',
    'Tenebrism intensifies the contrast between darkness and light to focus attention and produce drama.',
  ],
  territorio: [
    'El territorio articula espacio, poder, pertenencia, recursos y memoria mediante relaciones sociales y políticas.',
    'Territory articulates space, power, belonging, resources and memory through social and political relations.',
  ],
  testimonio: [
    'El testimonio transmite una experiencia vivida y vincula voz, memoria, evidencia y responsabilidad pública.',
    'Testimony conveys lived experience and links voice, memory, evidence and public responsibility.',
  ],
  textil: [
    'El textil construye superficies y objetos mediante fibras, hilos y técnicas de tejido, y conecta trabajo, cuerpo y comunidad.',
    'Textiles construct surfaces and objects through fibres, threads and weaving techniques, connecting labour, body and community.',
  ],
  textura: [
    'La textura describe la apariencia o tactilidad de una superficie y relaciona percepción, materia y técnica.',
    'Texture describes the appearance or tactility of a surface and relates perception, matter and technique.',
  ],
  tiempo: [
    'El tiempo estructura duración, cambio, memoria y experiencia, tanto en la producción como en la recepción de una obra.',
    'Time structures duration, change, memory and experience in both the making and reception of a work.',
  ],
  tierra: [
    'La tierra es suelo, materia y territorio, y vincula subsistencia, paisaje, extracción, pertenencia y conflicto.',
    'Earth is soil, matter and territory and links subsistence, landscape, extraction, belonging and conflict.',
  ],
  tipografia: [
    'La tipografía organiza formas de escritura para hacer visible el lenguaje y construir jerarquías, ritmos e identidades.',
    'Typography organises written forms to make language visible and construct hierarchies, rhythms and identities.',
  ],
  trabajador: [
    'El trabajador representa a la persona que aporta su labor y hace visibles relaciones de producción, clase y dignidad.',
    'The worker represents the person who contributes labour and makes relations of production, class and dignity visible.',
  ],
  trabajo: [
    'El trabajo organiza tiempo, esfuerzo, cooperación y valor, y atraviesa la producción artística y la vida social.',
    'Work organises time, effort, cooperation and value and runs through artistic production and social life.',
  ],
  'trabajo-industrial': [
    'El trabajo industrial se organiza mediante máquinas, división de tareas, disciplina y producción masiva.',
    'Industrial labour is organised through machines, division of tasks, discipline and mass production.',
  ],
  tradicion: [
    'La tradición transmite formas, técnicas y relatos, pero también se transforma cada vez que una comunidad los interpreta de nuevo.',
    'Tradition transmits forms, techniques and narratives but also changes whenever a community interprets them anew.',
  ],
  traduccion: [
    'La traducción desplaza palabras, imágenes y significados entre lenguas y contextos, produciendo equivalencias y diferencias.',
    'Translation moves words, images and meanings between languages and contexts, producing equivalences and differences.',
  ],
  trauma: [
    'El trauma nombra una herida o experiencia extrema que afecta memoria, cuerpo, relato y representación.',
    'Trauma names a wound or extreme experience that affects memory, body, narrative and representation.',
  ],
  'turismo-cultural': [
    'El turismo cultural organiza viajes alrededor de patrimonio, arte y memoria, y puede producir acceso, consumo y conflicto.',
    'Cultural tourism organises travel around heritage, art and memory and can produce access, consumption and conflict.',
  ],
  utopia: [
    'La utopía imagina una sociedad o espacio mejor para criticar el presente y ensayar posibilidades de futuro.',
    'Utopia imagines a better society or space in order to criticise the present and test possible futures.',
  ],
  vanguardia: [
    'La vanguardia propone rupturas con convenciones artísticas y sociales mediante experimentación, manifiestos y nuevas formas de circulación.',
    'The avant-garde proposes breaks with artistic and social conventions through experimentation, manifestos and new forms of circulation.',
  ],
  vida: [
    'La vida aparece como materia, proceso y valor, y permite relacionar arte con cuerpo, naturaleza, cuidado y experiencia cotidiana.',
    'Life appears as matter, process and value and connects art with body, nature, care and everyday experience.',
  ],
  video: [
    'El vídeo registra y transmite imagen y sonido en el tiempo, y puede funcionar como documento, montaje, instalación o interfaz.',
    'Video records and transmits image and sound in time and can function as document, montage, installation or interface.',
  ],
  vidrio: [
    'El vidrio combina transparencia, fragilidad, color y transformación térmica en objetos, arquitectura y escultura.',
    'Glass combines transparency, fragility, colour and thermal transformation in objects, architecture and sculpture.',
  ],
  violencia: [
    'La violencia produce daño y dominación, y puede ser analizada mediante cuerpos, imágenes, instituciones y memorias.',
    'Violence produces harm and domination and can be examined through bodies, images, institutions and memories.',
  ],
  xilografia: [
    'La xilografía imprime una matriz tallada en madera y relaciona incisión, repetición, contraste y circulación de imágenes.',
    'Woodcut prints from a carved wooden matrix and relates incision, repetition, contrast and the circulation of images.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-020.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_020', selection: '26 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_020: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
