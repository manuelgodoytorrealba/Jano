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
const entityIds = [
  'cmsvvxhiz004385sj4d1v5rpb',
  'cmsvvxhk1004o85sjlx4djzhk',
  'cmsvvxhju004l85sji7baa7qp',
  'cmsvvxhdc001685sjbwvbwi0l',
  'cmsvvxhj9004985sjmjgo0d6k',
  'cmsvvxhid003r85sjgtcifqhu',
  'cmsvvxhcr000x85sjkyns6vrq',
  'cmsvvxhdh001985sjm528sqxj',
  'cmsvvxhcz001085sj8qlvtbuz',
  'cmsvvxhje004c85sjpfejj7bq',
  'cmsvvxhjj004f85sjzmx72an6',
  'cmsvvxhck000u85sj1s00qkr2',
  'cmsvvxhjp004i85sjenkaiipo',
  'cmsvvxins00pv85sj60qeqlpq',
  'cmsvvxhd6001385sjkiqpaps6',
  'cmsvvxhcd000r85sjkqr6blt9',
  'cmsvvxhg5002i85sjfpl2rp7w',
  'cmsvvxhfy002f85sjsms0eo9z',
  'cmsvvxheo001r85sjsoxth4mm',
  'cmsvvxhhi003985sjv0ly16yr',
];
const uniqueIds = [...new Set(entityIds)];
const ids = uniqueIds.map(q).join(',');
const rows =
  JSON.parse(
    db(`
SELECT json_agg(row_to_json(x) ORDER BY x.slug)
FROM (
  SELECT e.id, e.slug, e.title,
    COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'), e.title) AS "enTitle",
    COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD'),'[]'::json) AS periods,
    COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT'),'[]'::json) AS concepts,
    COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_MOVEMENT'),'[]'::json) AS artists
  FROM "Entity" e WHERE e.id IN (${ids}) AND e.type='MOVEMENT' AND e.status='PUBLISHED'
) x`),
  ) || [];
if (rows.length !== uniqueIds.length)
  throw new Error(`Expected ${uniqueIds.length} movement entities, got ${rows.length}`);

const joinNatural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const essayFor = (r) => {
  const periods = joinNatural(r.periods || []);
  const concepts = joinNatural(r.concepts || []);
  const artists = joinNatural((r.artists || []).slice(0, 6));
  const lines = [
    `## Context`,
    '',
    `${r.enTitle} is presented as a historical framework that allows comparison without erasing internal differences. The entry keeps its claims proportionate to the sources and avoids treating a broad category as a single uniform style.`,
    '',
    `## Reading relationships`,
  ];
  if (periods) lines.push('', `Its chronology is situated within ${periods}.`);
  if (concepts) lines.push('', `${concepts} offer concrete paths for interpreting this movement.`);
  if (artists)
    lines.push('', `${artists} are studied within this framework through published relationships.`);
  lines.push(
    '',
    `## How to continue`,
    '',
    `The exploration should continue through the concrete connections and sources attached to the entity. Each relationship has a visible editorial reason; interpretations that go beyond those records require additional review and attributable evidence.`,
  );
  return lines.join('\n');
};
const out = rows.map((r) => ({ ...r, essay: essayFor(r), sourcesUsed: [] }));
let sql = 'BEGIN;';
for (const r of out) {
  sql += `UPDATE "EntityTranslation" SET "essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-movements-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_MOVEMENTS_001', selection: '20 published movements missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_MOVEMENTS_001: updated ${out.length} English essays transactionally.`,
);
