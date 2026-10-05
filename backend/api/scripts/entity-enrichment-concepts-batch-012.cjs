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
  bronce: [
    'El bronce es una aleación metálica cuya fundición y resistencia han sido fundamentales para la escultura, los objetos rituales y la cultura material.',
    'Bronze is a metal alloy whose casting and durability have been fundamental to sculpture, ritual objects and material culture.',
  ],
  canon: [
    'El canon es un conjunto de obras, autores y criterios de valor que una tradición presenta como central, y que siempre puede ser revisado.',
    'The canon is a set of works, authors and criteria of value that a tradition presents as central and that can always be revised.',
  ],
  censura: [
    'La censura regula, limita o suprime imágenes, discursos y obras según criterios políticos, religiosos, morales o institucionales.',
    'Censorship regulates, limits or suppresses images, discourses and works according to political, religious, moral or institutional criteria.',
  ],
  ceramica: [
    'La cerámica transforma la arcilla mediante modelado y cocción, articulando utilidad, técnica, superficie y expresión artística.',
    'Ceramics transforms clay through modelling and firing, bringing together use, technique, surface and artistic expression.',
  ],
  cine: [
    'El cine combina imagen en movimiento, montaje, sonido y actuación para construir experiencias narrativas, documentales y experimentales.',
    'Cinema combines moving image, editing, sound and performance to construct narrative, documentary and experimental experiences.',
  ],
  ciudad: [
    'La ciudad es un espacio construido de convivencia, circulación, conflicto, memoria y representación política.',
    'The city is a built space of coexistence, circulation, conflict, memory and political representation.',
  ],
  claroscuro: [
    'El claroscuro organiza la imagen mediante contrastes de luz y sombra que producen volumen, dramatismo y jerarquía visual.',
    'Chiaroscuro organises the image through contrasts of light and shadow that produce volume, drama and visual hierarchy.',
  ],
  'clase-social': [
    'La clase social nombra posiciones desiguales en la organización económica y política, visibles también en las imágenes y sus públicos.',
    'Social class names unequal positions in economic and political organisation, also visible in images and their publics.',
  ],
  clima: [
    'El clima afecta las condiciones de vida y se convierte en un problema artístico, ecológico y político cuando se representan sus transformaciones.',
    'Climate shapes living conditions and becomes an artistic, ecological and political issue when its transformations are represented.',
  ],
  collage: [
    'El collage construye una imagen mediante la unión de fragmentos heterogéneos, alterando las relaciones entre originalidad, montaje y significado.',
    'Collage constructs an image by joining heterogeneous fragments and changing the relations between originality, montage and meaning.',
  ],
  colonialismo: [
    'El colonialismo organiza relaciones de dominación territorial y cultural que afectan la producción, circulación y lectura de las imágenes.',
    'Colonialism organises relations of territorial and cultural domination that affect the production, circulation and reading of images.',
  ],
  color: [
    'El color es una dimensión perceptiva, material y cultural que puede describir, simbolizar, ordenar o desestabilizar una imagen.',
    'Colour is a perceptual, material and cultural dimension that can describe, symbolise, organise or destabilise an image.',
  ],
  comunidad: [
    'La comunidad reúne formas de pertenencia, cuidado y acción colectiva que pueden constituir tanto el tema como el método de una práctica artística.',
    'Community brings together forms of belonging, care and collective action that can constitute both the subject and method of an artistic practice.',
  ],
  conservacion: [
    'La conservación reúne conocimientos y decisiones destinadas a preservar obras y a negociar los cambios inevitables de sus materiales.',
    'Conservation brings together knowledge and decisions intended to preserve works while negotiating the inevitable changes of their materials.',
  ],
  consumo: [
    'El consumo describe la adquisición y uso de bienes, pero también los deseos, identidades y relaciones sociales que las imágenes pueden producir.',
    'Consumption describes the acquisition and use of goods, as well as the desires, identities and social relations images can produce.',
  ],
  'cuerpo-politico': [
    'El cuerpo político entiende el cuerpo como espacio de poder, identidad, regulación, resistencia y representación colectiva.',
    'The political body understands the body as a space of power, identity, regulation, resistance and collective representation.',
  ],
  cuidado: [
    'El cuidado comprende prácticas de atención, mantenimiento y dependencia que cuestionan la separación entre producción artística y vida cotidiana.',
    'Care comprises practices of attention, maintenance and dependency that question the separation between artistic production and everyday life.',
  ],
  'cultura-popular': [
    'La cultura popular reúne formas, relatos y prácticas producidos y compartidos fuera de los circuitos de legitimación elitista.',
    'Popular culture brings together forms, narratives and practices produced and shared beyond elite circuits of legitimation.',
  ],
  danza: [
    'La danza organiza el cuerpo en movimiento mediante ritmo, espacio, gesto y relación con otros cuerpos y medios.',
    'Dance organises the moving body through rhythm, space, gesture and relations with other bodies and media.',
  ],
  'derechos-culturales': [
    'Los derechos culturales protegen la participación, expresión, acceso y pertenencia de las personas y comunidades en la vida cultural.',
    'Cultural rights protect people’s and communities’ participation, expression, access and belonging in cultural life.',
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
  const relEs = r.related.length
    ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}.`
    : 'El concepto funciona como una entrada interpretativa abierta.';
  const relEn = r.related.length
    ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}.`
    : 'The concept functions as an open interpretive entry.';
  return {
    ...r,
    summary_es: es,
    summary_en: en,
    essay_es: `## Definición\n\n${es}\n\n## Relaciones de lectura\n\n${relEs}\n\n## Cómo continuar\n\nLa exploración debe seguir las entidades y fuentes conectadas; las interpretaciones específicas requieren evidencia atribuible.`,
    essay_en: `## Definition\n\n${en}\n\n## Reading relationships\n\n${relEn}\n\n## How to continue\n\nContinue through the connected entities and sources; specific interpretations require attributable evidence.`,
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-012.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_012', selection: '20 published concepts missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_012: updated ${out.length} concepts with bilingual editorial fields transactionally.`,
);
