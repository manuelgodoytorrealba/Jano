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
  'agustin-de-hipona': [
    'Agustín de Hipona fue un pensador cristiano cuya obra influyó en debates sobre memoria, tiempo, imagen, conocimiento y cultura medieval.',
    'Augustine of Hippo was a Christian thinker whose work influenced debates about memory, time, image, knowledge and medieval culture.',
  ],
  aristoteles: [
    'Aristóteles fue un filósofo griego cuya obra abordó poética, retórica, naturaleza, conocimiento y formas de organización del mundo antiguo.',
    'Aristotle was a Greek philosopher whose work addressed poetics, rhetoric, nature, knowledge and forms of organisation in the ancient world.',
  ],
  homer: [
    'Homero es el nombre tradicional asociado a la Ilíada y la Odisea, figuras centrales para estudiar oralidad, mito, literatura e imaginación visual griega.',
    'Homer is the traditional name associated with the Iliad and the Odyssey, central to the study of orality, myth, literature and Greek visual imagination.',
  ],
  'plinio-el-viejo': [
    'Plinio el Viejo fue un escritor y naturalista romano cuya Historia natural transmitió conocimientos sobre arte, naturaleza, materiales y antigüedad.',
    'Pliny the Elder was a Roman writer and naturalist whose Natural History transmitted knowledge about art, nature, materials and antiquity.',
  ],
  sophocles: [
    'Sófocles fue un dramaturgo griego cuyas tragedias contribuyeron a la historia del teatro, la narración mítica y la reflexión sobre conflicto y destino.',
    'Sophocles was a Greek playwright whose tragedies contributed to the history of theatre, mythic narrative and reflection on conflict and fate.',
  ],
  vitruvio: [
    'Vitruvio fue un arquitecto y escritor romano conocido por un tratado que relacionó arquitectura, proporción, técnica, materiales y conocimiento humanista.',
    'Vitruvius was a Roman architect and writer known for a treatise connecting architecture, proportion, technique, materials and humanist knowledge.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='PERSON' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published persons, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar la persona a través de textos, obras, periodos, lugares y tradiciones.` : 'La entrada funciona como un punto de partida para investigar su obra, recepción y contexto histórico.'}\n\n## Cómo continuar\n\nConviene distinguir entre datos biográficos, atribuciones posteriores y las formas en que cada época ha construido su recepción.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the person to be studied through texts, works, periods, places and traditions.` : 'This entry is a starting point for investigating the person’s work, reception and historical context.'}\n\n## How to continue\n\nDistinguish between biographical data, later attributions and the ways each period has constructed the person’s reception.`,
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
  'artifacts/editorial-recovery/entity-enrichment-persons-batch-081.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PERSONS_081', selection: '6 published persons missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_PERSONS_081: updated ${out.length} persons with bilingual base editorial fields transactionally.`,
);
