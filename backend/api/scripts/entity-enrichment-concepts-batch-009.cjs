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
const entityIds = [
  'cmsvvxhqx008685sjm5vl3y4c',
  'cmsvvxhoh006u85sjnwl5nr13',
  'cmsvvxj2e00yv85sjlkhh37xz',
  'cmsvvxjsk01f185sj9zhyv5t9',
  'cmsvvxhmw006085sjdqwfwsgj',
  'cmsvvxjty01fy85sjng6xox1m',
  'cmsvvxjv001gm85sjqvx9e6h8',
  'cmsvvxjv901gs85sjj948x0uo',
  'cmqtmi4ut001x35nyczqvayy4',
  'cmsvvxhur00a085sjsl76vv3z',
  'cmsvvxhlv005i85sjlusmoy13',
  'cmsvvxjrx01em85sjqi6qmb50',
  'cmsvvxjsa01ev85sj35fbdb2j',
  'cmsvvxjtk01fp85sjc31gtiwz',
  'cmsvvxk1o01l785sjhvnq9vjc',
  'cmsvvxjyp01j785sjcshh5uka',
  'cmsvvxk2301lg85sjlcbyda8n',
  'cmsvvxj1000xy85sjnv5su3gq',
  'cmsvvxhq1007o85sj548vtx0s',
  'cmsvvxhvc00ac85sj1v2h0fxx',
];
const ids = entityIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM(SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD'),'[]'::json) AS periods,COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTIST'),'[]'::json) AS artists,COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTWORK'),'[]'::json) AS artworks,COALESCE((SELECT json_agg(DISTINCT m.title ORDER BY m.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" m ON m.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND m.type='MOVEMENT'),'[]'::json) AS movements FROM "Entity" e WHERE e.id IN(${ids}) AND e.type='CONCEPT' AND e.status='PUBLISHED')x`,
    ),
  ) || [];
if (rows.length !== entityIds.length)
  throw new Error(`Expected ${entityIds.length} concept entities, got ${rows.length}`);
const join = (a) =>
  a.length === 0 ? '' : a.length === 1 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const essay = (r) => {
  const p = join(r.periods || []),
    a = join((r.artists || []).slice(0, 8)),
    w = join((r.artworks || []).slice(0, 8)),
    m = join((r.movements || []).slice(0, 8));
  const l = [
    '## Context',
    '',
    `${r.enTitle} is treated as an interpretive concept rather than as a fixed definition. The entry distinguishes the term from the varied historical, material and cultural situations in which it appears.`,
    '',
    '## Reading relationships',
  ];
  if (p) l.push('', `Its historical framing connects with ${p}.`);
  if (m)
    l.push(
      '',
      `Published relationships with ${m} provide art-historical contexts for reading the concept.`,
    );
  if (a) l.push('', `${a} offer documented artist-level points of entry.`);
  if (w) l.push('', `${w} make the concept visible through concrete works and objects.`);
  l.push(
    '',
    '## How to continue',
    '',
    `The exploration should continue through the connected entities and sources attached to this entry. The relationships show the evidence-backed paths available in the catalogue; broader interpretations require additional review and attributable evidence.`,
  );
  return l.join('\n');
};
const out = rows.map((r) => ({ ...r, essay: essay(r), sourcesUsed: [] }));
let sql = 'BEGIN;';
for (const r of out)
  sql += `UPDATE "EntityTranslation" SET "essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-009.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_009', selection: '20 published concepts missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_009: updated ${out.length} English essays transactionally.`,
);
