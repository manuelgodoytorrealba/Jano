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
  'cmsvvxhpx007l85sjh7m7iq9f',
  'cmsvvxjwp01hs85sj8fdwukto',
  'cmsvvxk3501m785sj7vqda8q6',
  'cmsvvxhwr00b385sjo73qxa9o',
  'cmsvvxk2o01lv85sjd9vgrjae',
  'cmsvvxhtz009l85sjqjwk1oik',
  'cmsvvxjuh01ga85sj7xgyncnh',
  'cmsvvxhuf009u85sjrk2q7jal',
  'cmsvvxjyx01jd85sjshbiefe2',
  'cmsvvxjuw01gj85sjw93y5ead',
  'cmsvvxjre01ea85sjefbs159f',
  'cmsvvxju801g485sjddicvm1n',
  'cmsvvxj1800y485sjukx7o1am',
  'cmsvvxjxv01im85sj91gbr9p9',
  'cmsvvxhsl008x85sj5kpzmtqc',
  'cmsvvxjzx01k185sj70fbxnli',
  'cmsvvxk0o01kj85sj6rwa07r5',
  'cmsvvxhqi007x85sj10l4vr4j',
  'cmsvvxhr3008985sjnuupmo0b',
  'cmsvvxhkq004x85sj0gg2hxzv',
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
    COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTIST' LIMIT 8),'[]'::json) AS artists,
    COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTWORK' LIMIT 8),'[]'::json) AS artworks,
    COALESCE((SELECT json_agg(DISTINCT m.title ORDER BY m.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" m ON m.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND m.type='MOVEMENT' LIMIT 8),'[]'::json) AS movements
  FROM "Entity" e WHERE e.id IN (${ids}) AND e.type='CONCEPT' AND e.status='PUBLISHED'
) x`),
  ) || [];
if (rows.length !== uniqueIds.length)
  throw new Error(`Expected ${uniqueIds.length} concept entities, got ${rows.length}`);

const joinNatural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const essayFor = (r) => {
  const periods = joinNatural(r.periods || []);
  const artists = joinNatural((r.artists || []).slice(0, 8));
  const artworks = joinNatural((r.artworks || []).slice(0, 8));
  const movements = joinNatural((r.movements || []).slice(0, 8));
  const lines = [
    `## Context`,
    '',
    `${r.enTitle} is treated as an interpretive concept rather than as a fixed definition. The entry distinguishes the term from the varied historical, material and cultural situations in which it appears.`,
    '',
    `## Reading relationships`,
  ];
  if (periods) lines.push('', `Its historical framing connects with ${periods}.`);
  if (movements)
    lines.push(
      '',
      `Published relationships with ${movements} provide art-historical contexts for reading the concept.`,
    );
  if (artists) lines.push('', `${artists} offer documented artist-level points of entry.`);
  if (artworks)
    lines.push('', `${artworks} make the concept visible through concrete works and objects.`);
  lines.push(
    '',
    `## How to continue`,
    '',
    `The exploration should continue through the connected entities and sources attached to this entry. The relationships show the evidence-backed paths available in the catalogue; broader interpretations require additional review and attributable evidence.`,
  );
  return lines.join('\n');
};
const out = rows.map((r) => ({ ...r, essay: essayFor(r), sourcesUsed: [] }));
let sql = 'BEGIN;';
for (const r of out)
  sql += `UPDATE "EntityTranslation" SET "essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_001', selection: '20 published concepts missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_001: updated ${out.length} English essays transactionally.`,
);
