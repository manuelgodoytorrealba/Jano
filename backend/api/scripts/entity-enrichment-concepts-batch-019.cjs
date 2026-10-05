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
  retrato: [
    'El retrato representa a una persona y articula identidad, presencia, memoria, estatus y relación entre modelo y mirada.',
    'Portraiture represents a person and articulates identity, presence, memory, status and the relation between model and gaze.',
  ],
  revolucion: [
    'La revolución transforma órdenes políticos y sociales, y produce imágenes, símbolos y relatos sobre ruptura y futuro.',
    'Revolution transforms political and social orders and produces images, symbols and narratives about rupture and the future.',
  ],
  'revolucion-industrial': [
    'La Revolución Industrial reorganizó producción, energía, trabajo y urbanización mediante máquinas y nuevas formas de economía.',
    'The Industrial Revolution reorganised production, energy, labour and urbanisation through machines and new economic forms.',
  ],
  ritmo: [
    'El ritmo ordena repeticiones, pausas y variaciones en imágenes, sonidos, cuerpos y secuencias temporales.',
    'Rhythm organises repetitions, pauses and variations in images, sounds, bodies and temporal sequences.',
  ],
  ruina: [
    'La ruina es un resto arquitectónico o material que hace visible el paso del tiempo, la pérdida y la construcción de memoria.',
    'A ruin is an architectural or material remainder that makes time, loss and the construction of memory visible.',
  ],
  sagrado: [
    'Lo sagrado designa aquello separado y cargado de valor ritual, espiritual o comunitario.',
    'The sacred describes what is set apart and charged with ritual, spiritual or communal value.',
  ],
  secularizacion: [
    'La secularización transforma las relaciones entre religión, instituciones, conocimiento e imágenes en la vida pública.',
    'Secularisation transforms relations among religion, institutions, knowledge and images in public life.',
  ],
  'segunda-revolucion-industrial': [
    'La Segunda Revolución Industrial expandió electricidad, acero, química, transporte y producción masiva, transformando la experiencia moderna.',
    'The Second Industrial Revolution expanded electricity, steel, chemistry, transport and mass production, transforming modern experience.',
  ],
  serigrafia: [
    'La serigrafía imprime tinta a través de una malla y facilita capas de color, repetición y circulación de imágenes.',
    'Screen printing pushes ink through a mesh and facilitates colour layers, repetition and the circulation of images.',
  ],
  sexualidad: [
    'La sexualidad comprende deseos, prácticas, identidades y normas que organizan la experiencia corporal y social.',
    'Sexuality comprises desires, practices, identities and norms that organise bodily and social experience.',
  ],
  sfumato: [
    'El sfumato modela transiciones suaves entre luz y sombra para producir atmósferas, profundidad y ambigüedad en la imagen.',
    'Sfumato models soft transitions between light and shadow to produce atmosphere, depth and ambiguity in the image.',
  ],
  simetria: [
    'La simetría organiza partes equivalentes alrededor de un eje o centro, produciendo equilibrio, orden y variación controlada.',
    'Symmetry organises equivalent parts around an axis or centre, producing balance, order and controlled variation.',
  ],
  sombra: [
    'La sombra señala ausencia de luz y puede construir volumen, atmósfera, ocultamiento y presencia indirecta.',
    'Shadow signals the absence of light and can construct volume, atmosphere, concealment and indirect presence.',
  ],
  sonido: [
    'El sonido organiza vibraciones, voces, ruidos y silencios en el tiempo y puede ampliar la experiencia espacial de una obra.',
    'Sound organises vibrations, voices, noises and silences in time and can expand the spatial experience of a work.',
  ],
  sostenibilidad: [
    'La sostenibilidad busca mantener condiciones ecológicas, sociales y materiales a largo plazo, cuestionando modos de producción y consumo.',
    'Sustainability seeks to maintain ecological, social and material conditions over time, questioning modes of production and consumption.',
  ],
  'sostenibilidad-urbana': [
    'La sostenibilidad urbana relaciona diseño, movilidad, recursos, vivienda y justicia ambiental en la vida de las ciudades.',
    'Urban sustainability relates design, mobility, resources, housing and environmental justice in city life.',
  ],
  sublime: [
    'Lo sublime describe una experiencia de grandeza, exceso o temor que desborda la medida y la representación ordinaria.',
    'The sublime describes an experience of greatness, excess or fear that exceeds ordinary measure and representation.',
  ],
  sueno: [
    'El sueño articula imágenes, deseos y asociaciones no regidas por la lógica cotidiana, y puede abrir espacios de imaginación.',
    'The dream articulates images, desires and associations not governed by everyday logic and can open spaces of imagination.',
  ],
  talla: [
    'La talla elimina material mediante cortes o golpes para revelar o construir una forma en madera, piedra u otros soportes.',
    'Carving removes material through cuts or blows to reveal or construct a form in wood, stone or other supports.',
  ],
  taller: [
    'El taller es un espacio de producción, aprendizaje y colaboración donde se transmiten técnicas y se organizan relaciones de trabajo.',
    'The workshop is a space of production, learning and collaboration where techniques are transmitted and working relations organised.',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-019.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_019', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_019: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
