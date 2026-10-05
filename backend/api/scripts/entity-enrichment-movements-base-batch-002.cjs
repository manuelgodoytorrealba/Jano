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
  constructivismo: [
    'El constructivismo entendió la obra como una construcción material y social, vinculada a la geometría, la industria y la transformación de la vida colectiva.',
    'Constructivism understood art as a material and social construction connected to geometry, industry and the transformation of collective life.',
  ],
  dadaismo: [
    'El dadaísmo cuestionó las convenciones artísticas mediante azar, collage, humor, performance y objetos encontrados, en respuesta a la crisis cultural de la Primera Guerra Mundial.',
    'Dada questioned artistic conventions through chance, collage, humour, performance and found objects in response to the cultural crisis of the First World War.',
  ],
  'de-stijl': [
    'De Stijl propuso una síntesis visual basada en geometría, líneas ortogonales y colores primarios, con aspiraciones de integrar arte, diseño y arquitectura.',
    'De Stijl proposed a visual synthesis based on geometry, orthogonal lines and primary colours, aspiring to integrate art, design and architecture.',
  ],
  expresionismo: [
    'El expresionismo privilegió la intensidad subjetiva y la distorsión formal para abordar ansiedad, conflicto, espiritualidad y experiencia moderna en contextos diversos.',
    'Expressionism privileged subjective intensity and formal distortion to address anxiety, conflict, spirituality and modern experience in diverse contexts.',
  ],
  'expresionismo-abstracto': [
    'El expresionismo abstracto reunió prácticas de gran escala, gesto, campo cromático y experimentación material en el arte estadounidense de la posguerra.',
    'Abstract Expressionism brought together large-scale practices of gesture, colour field and material experimentation in post-war American art.',
  ],
  fauvismo: [
    'El fauvismo exploró el color intenso y no naturalista, la simplificación de la forma y la autonomía expresiva de la pincelada a comienzos del siglo XX.',
    'Fauvism explored intense, non-naturalistic colour, simplified form and the expressive autonomy of the brushstroke in the early twentieth century.',
  ],
  fluxus: [
    'Fluxus articuló acciones, música, objetos, instrucciones y humor para cuestionar las fronteras entre arte y vida y favorecer prácticas abiertas y colaborativas.',
    'Fluxus brought together actions, music, objects, instructions and humour to question the boundaries between art and life and encourage open, collaborative practices.',
  ],
  'fotografia-moderna': [
    'La fotografía moderna investigó encuadre, luz, serialidad, abstracción y circulación de imágenes, redefiniendo la relación entre documento y experiencia visual.',
    'Modern photography investigated framing, light, seriality, abstraction and the circulation of images, redefining the relation between document and visual experience.',
  ],
  futurismo: [
    'El futurismo celebró velocidad, tecnología, energía urbana y movimiento mediante composiciones dinámicas, con una dimensión política y propagandística contradictoria.',
    'Futurism celebrated speed, technology, urban energy and movement through dynamic compositions, with a contradictory political and propagandistic dimension.',
  ],
  gotico: [
    'El gótico reúne formas artísticas medievales asociadas a verticalidad, luz, narración religiosa y complejas redes de taller en distintas regiones europeas.',
    'Gothic encompasses medieval artistic forms associated with verticality, light, religious narrative and complex workshop networks across different European regions.',
  ],
  graffiti: [
    'El graffiti utiliza inscripciones, firmas e imágenes en el espacio público y se relaciona con identidad, visibilidad, territorio y disputas sobre la ciudad.',
    'Graffiti uses inscriptions, tags and images in public space and relates to identity, visibility, territory and disputes over the city.',
  ],
  impresionismo: [
    'El impresionismo exploró luz, atmósfera, percepción y vida moderna mediante pinceladas visibles y escenas observadas en momentos concretos.',
    'Impressionism explored light, atmosphere, perception and modern life through visible brushwork and scenes observed at particular moments.',
  ],
  informalismo: [
    'El informalismo reunió prácticas centradas en materia, gesto, textura y accidente, especialmente en la Europa de la posguerra y sus contextos particulares.',
    'Informalism brought together practices focused on matter, gesture, texture and accident, especially in post-war Europe and its specific contexts.',
  ],
  'land-art': [
    'Land Art desplazó parte de la producción artística hacia el paisaje y el territorio, haciendo visibles escala, duración, recorrido y transformación ambiental.',
    'Land Art moved part of artistic production into landscape and territory, making scale, duration, movement and environmental transformation visible.',
  ],
  minimalismo: [
    'El minimalismo empleó formas geométricas, repetición, serialidad y materiales industriales para enfatizar la relación entre objeto, espacio y espectador.',
    'Minimalism used geometric forms, repetition, seriality and industrial materials to emphasise the relation between object, space and viewer.',
  ],
  'modernismo-brasileno': [
    'El modernismo brasileño reelaboró lenguajes modernos desde las condiciones culturales, sociales y territoriales de Brasil, con especial atención a identidad y experimentación.',
    'Brazilian modernism reworked modern languages through Brazil’s cultural, social and territorial conditions, with particular attention to identity and experimentation.',
  ],
  'muralismo-mexicano': [
    'El muralismo mexicano vinculó pintura monumental, espacio público, historia, educación y debate político en proyectos desarrollados tras la Revolución mexicana.',
    'Mexican muralism connected monumental painting, public space, history, education and political debate in projects developed after the Mexican Revolution.',
  ],
  orfismo: [
    'El orfismo exploró color, ritmo y simultaneidad para construir una pintura dinámica relacionada con la abstracción y la experiencia moderna.',
    'Orphism explored colour, rhythm and simultaneity to construct dynamic painting related to abstraction and modern experience.',
  ],
  'pop-art': [
    'El Pop Art incorporó imágenes de publicidad, consumo, celebridad y medios de masas para examinar la circulación social de las imágenes.',
    'Pop Art incorporated images from advertising, consumer culture, celebrity and mass media to examine the social circulation of images.',
  ],
  postimpresionismo: [
    'El postimpresionismo reúne búsquedas posteriores al impresionismo que intensificaron estructura, color, símbolo y expresión sin constituir un estilo único.',
    'Post-Impressionism encompasses post-Impressionist investigations that intensified structure, colour, symbol and expression without forming a single style.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='MOVEMENT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published movements, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten leer el movimiento junto a obras, artistas y conceptos concretos.` : 'La entrada ofrece un punto de partida para investigar sus obras, agentes y contextos.'}\n\n## Cómo continuar\n\nConviene contrastar las conexiones del catálogo con fuentes históricas y atender a sus diferencias internas y geográficas.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the movement to be read alongside concrete works, artists and concepts.` : 'This entry is a starting point for investigating its works, agents and contexts.'}\n\n## How to continue\n\nThe catalogue connections should be compared with historical sources, while attending to internal and geographical differences.`,
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
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(locale === 'en' ? r.enTitle : r.title)},${q(r['summary_' + locale])},${q(r['essay_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","essay"=EXCLUDED."essay","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-movements-base-batch-002.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_MOVEMENTS_BASE_002', selection: '20 published movements missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_MOVEMENTS_BASE_002: updated ${out.length} movements with bilingual base editorial fields transactionally.`,
);
