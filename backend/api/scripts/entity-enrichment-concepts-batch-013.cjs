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
  deseo: [
    'El deseo nombra impulsos, proyecciones y relaciones de falta que atraviesan las imágenes, los cuerpos y las formas de consumo.',
    'Desire names impulses, projections and relations of lack that traverse images, bodies and forms of consumption.',
  ],
  desnudo: [
    'El desnudo es una tradición de representación del cuerpo que articula idealización, mirada, género, poder y vulnerabilidad.',
    'The nude is a tradition of representing the body that articulates idealisation, gaze, gender, power and vulnerability.',
  ],
  diaspora: [
    'La diáspora describe experiencias de desplazamiento, dispersión y pertenencia múltiple que transforman memoria, identidad y representación.',
    'Diaspora describes experiences of displacement, dispersal and multiple belonging that transform memory, identity and representation.',
  ],
  dibujo: [
    'El dibujo registra líneas, gestos y decisiones sobre una superficie, y puede funcionar como obra, proyecto, estudio o notación.',
    'Drawing records lines, gestures and decisions on a surface and can function as artwork, project, study or notation.',
  ],
  digital: [
    'Lo digital designa prácticas y condiciones artísticas basadas en datos, código, redes y dispositivos de computación.',
    'The digital describes artistic practices and conditions based on data, code, networks and computational devices.',
  ],
  discapacidad: [
    'La discapacidad permite analizar cuerpos, accesos y normas sociales, y también las prácticas artísticas que cuestionan su representación.',
    'Disability makes it possible to examine bodies, access and social norms, as well as artistic practices that question their representation.',
  ],
  'diseno-grafico': [
    'El diseño gráfico organiza texto, imagen, forma y circulación para comunicar y construir identidades visuales.',
    'Graphic design organises text, image, form and circulation to communicate and construct visual identities.',
  ],
  distopia: [
    'La distopía imagina futuros o sociedades opresivas para examinar conflictos políticos, tecnológicos y sociales del presente.',
    'Dystopia imagines oppressive futures or societies in order to examine present political, technological and social conflicts.',
  ],
  domesticidad: [
    'La domesticidad reúne prácticas, espacios y afectos asociados a la vida del hogar, y revela cómo se distribuyen trabajo, intimidad y poder.',
    'Domesticity brings together practices, spaces and affects associated with home life, revealing how work, intimacy and power are distributed.',
  ],
  duelo: [
    'El duelo articula pérdida, memoria y transformación, y puede convertirse en una forma de elaboración individual y colectiva.',
    'Mourning articulates loss, memory and transformation and can become a form of individual and collective working-through.',
  ],
  ecologia: [
    'La ecología estudia relaciones entre seres vivos, materiales y entornos, y orienta prácticas artísticas atentas a la interdependencia.',
    'Ecology studies relations among living beings, materials and environments and informs artistic practices attentive to interdependence.',
  ],
  educacion: [
    'La educación transmite saberes y produce formas de relación, imaginación y ciudadanía, también dentro de las instituciones artísticas.',
    'Education transmits knowledge and produces forms of relation, imagination and citizenship, including within artistic institutions.',
  ],
  ensamblaje: [
    'El ensamblaje construye objetos o imágenes mediante la reunión de materiales y fragmentos que conservan huellas de su uso anterior.',
    'Assemblage constructs objects or images by bringing together materials and fragments that retain traces of previous use.',
  ],
  escala: [
    'La escala relaciona tamaños, proporciones y medidas, y modifica la percepción corporal y política de una obra o espacio.',
    'Scale relates sizes, proportions and measurements and changes the bodily and political perception of a work or space.',
  ],
  esclavitud: [
    'La esclavitud es un sistema histórico de apropiación y violencia que continúa afectando memoria, representación, patrimonio y desigualdad.',
    'Slavery is a historical system of appropriation and violence that continues to shape memory, representation, heritage and inequality.',
  ],
  escuela: [
    'La escuela es una institución de aprendizaje y socialización que también produce modelos de disciplina, creatividad y pertenencia.',
    'The school is an institution of learning and socialisation that also produces models of discipline, creativity and belonging.',
  ],
  espacio: [
    'El espacio organiza distancias, cuerpos, recorridos y relaciones, tanto en la obra como en el lugar donde se encuentra.',
    'Space organises distances, bodies, paths and relations, both within a work and in the place where it is encountered.',
  ],
  'espacio-publico': [
    'El espacio público es un ámbito compartido de encuentro, conflicto, visibilidad y negociación política.',
    'Public space is a shared setting for encounter, conflict, visibility and political negotiation.',
  ],
  espectaculo: [
    'El espectáculo organiza una experiencia pública mediante escena, mirada, atención y formas de participación o consumo.',
    'Spectacle organises a public experience through staging, looking, attention and forms of participation or consumption.',
  ],
  esperanza: [
    'La esperanza proyecta posibilidades de futuro y puede sostener prácticas de resistencia, cuidado y transformación colectiva.',
    'Hope projects possible futures and can sustain practices of resistance, care and collective transformation.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-013.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_013', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_013: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
