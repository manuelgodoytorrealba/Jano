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
  'exposicion-armory-show': [
    'La Armory Show fue una exposición de 1913 que presentó al público estadounidense numerosas propuestas modernas y alteró la percepción de las vanguardias europeas y americanas.',
    'The Armory Show was a 1913 exhibition that introduced American audiences to many modern proposals and altered perceptions of European and American avant-gardes.',
  ],
  'guerra-civil-espanola': [
    'La Guerra Civil española fue un conflicto político y social cuya memoria atraviesa imágenes, propaganda, exilio, violencia y prácticas artísticas del siglo XX.',
    'The Spanish Civil War was a political and social conflict whose memory runs through images, propaganda, exile, violence and twentieth-century artistic practices.',
  ],
  'primera-guerra-mundial': [
    'La Primera Guerra Mundial transformó sociedades, territorios y culturas visuales, y produjo respuestas artísticas vinculadas a trauma, propaganda, tecnología y ruptura.',
    'The First World War transformed societies, territories and visual cultures, producing artistic responses connected to trauma, propaganda, technology and rupture.',
  ],
  'revolucion-francesa': [
    'La Revolución francesa alteró las estructuras políticas y simbólicas europeas y modificó las relaciones entre arte, ciudadanía, monumento y representación del poder.',
    'The French Revolution altered European political and symbolic structures and changed relations between art, citizenship, monuments and the representation of power.',
  ],
  'revolucion-rusa': [
    'La Revolución rusa abrió un periodo de transformación política y experimentación cultural que afectó a vanguardias, diseño, propaganda y pedagogías artísticas.',
    'The Russian Revolution opened a period of political transformation and cultural experimentation affecting avant-gardes, design, propaganda and art pedagogies.',
  ],
  'segunda-guerra-mundial': [
    'La Segunda Guerra Mundial reorganizó territorios, poblaciones e instituciones culturales, dejando huellas profundas en memoria, exilio, documentación y prácticas artísticas.',
    'The Second World War reorganised territories, populations and cultural institutions, leaving deep traces in memory, exile, documentation and artistic practices.',
  ],
  '_wave002-87a4c47fed1aba8f': [
    'La Revolución de julio de 1830 fue un episodio de cambio político europeo que permite estudiar relaciones entre imagen pública, ciudadanía, memoria y representación histórica.',
    'The July Revolution of 1830 was an episode of European political change that allows study of relations between public image, citizenship, memory and historical representation.',
  ],
  '_wave002-88e68a350ae62f81': [
    'The Last Picture Show: Artists Using Photography, 1960-1982 fue una exposición dedicada a prácticas fotográficas que ampliaron los límites entre documento, arte conceptual y cultura visual.',
    'The Last Picture Show: Artists Using Photography, 1960-1982 was an exhibition devoted to photographic practices that expanded the boundaries between document, conceptual art and visual culture.',
  ],
  '_wave002-c9738c77caaa7eef': [
    'THINKING AHEAD: Progressive Design + Black Mountain College exploró la relación entre diseño progresista, pedagogía experimental y colaboración artística.',
    'THINKING AHEAD: Progressive Design + Black Mountain College explored the relation between progressive design, experimental pedagogy and artistic collaboration.',
  ],
  '_wave002-fa8862ede5a584e2': [
    'The Quick and the Dead fue una exposición centrada en temporalidad, velocidad, vida y muerte, y en las formas en que el arte hace perceptibles esos procesos.',
    'The Quick and the Dead was an exhibition focused on temporality, speed, life and death, and on how art makes these processes perceptible.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='EVENT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published events, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar el acontecimiento a través de lugares, obras, artistas, movimientos y periodos.` : 'La entrada funciona como un punto de partida para investigar sus actores, cronología y consecuencias culturales.'}\n\n## Cómo continuar\n\nConviene distinguir entre el acontecimiento histórico, sus representaciones y las memorias construidas posteriormente.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the event to be studied through places, works, artists, movements and periods.` : 'This entry is a starting point for investigating its actors, chronology and cultural consequences.'}\n\n## How to continue\n\nDistinguish between the historical event, its representations and the memories constructed afterwards.`,
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
  'artifacts/editorial-recovery/entity-enrichment-events-batch-079.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_EVENTS_079', selection: '10 published events missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_EVENTS_079: updated ${out.length} events with bilingual base editorial fields transactionally.`,
);
