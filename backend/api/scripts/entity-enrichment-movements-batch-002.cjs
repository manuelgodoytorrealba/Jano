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
  'cmsvvxhh3003085sj03ag5pqk',
  'cmsvvxhh8003385sjnhjsqmc7',
  'cmsvvxhhd003685sjkrbdnsu2',
  'cmsvvxhgg002o85sjqq5xd9xl',
  'cmsvvxhht003f85sjakwn3xr8',
  'cmsvvxhgb002l85sj3vom1621',
  'cmsvvxhii003u85sjkw6y4p0j',
  'cmsvvxinn00ps85sjxc212egu',
  'cmsvvxhgr002u85sj486vbjk6',
  'cmsvvxhe0001f85sjkgezpes2',
  'cmt0h4p4o002u07p5tp0d2ac9',
  'cmsvvxhfg002685sjif8tu2xz',
  'cmsvvxhhy003i85sjnho3u8v3',
  'cmsvvxhin003x85sjitocb43f',
  'cmsvvxhi8003o85sjj13b8aa1',
  'cmsvvxhk7004r85sjtzx6cemm',
  'cmsvvxhit004085sjemh348j3',
  'cmsvvxini00pp85sj3ysolrfp',
  'cmsvvxhi3003l85sjk2fcjol6',
  'cmsvvxhfm002985sjg6wyq6ri',
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
for (const r of out)
  sql += `UPDATE "EntityTranslation" SET "essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-movements-batch-002.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_MOVEMENTS_002', selection: '20 published movements missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_MOVEMENTS_002: updated ${out.length} English essays transactionally.`,
);
