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
  'cmsvvxjwt01hv85sjxvwoesmh',
  'cmsvvxjzt01jy85sj4qgcqhih',
  'cmsvvxk3e01md85sjdtt7ahsx',
  'cmsvvxhp8007985sjpnmfu01z',
  'cmsvvxhtu009i85sj3z9xhn99',
  'cmsvvxjs101ep85sjcxhygmgd',
  'cmsvvxjvn01h185sjfcckg26m',
  'cmsvvxjxz01ip85sj70p5z8g5',
  'cmsvvxk0x01kp85sj3w7y2uah',
  'cmsvvxjtb01fj85sjzintq9rw',
  'cmsvvxhl7005685sjg8aqzdxt',
  'cmsvvxjus01gg85sjb5fkq50g',
  'cmsvvxk1f01l185sj8gr10ngp',
  'cmsvvxjvv01h785sjoocutvj2',
  'cmsvvxhnp006f85sjpv90clxs',
  'cmsvvxj2500yp85sj6iijmypx',
  'cmsvvxhpp007i85sjtnfw5o7g',
  'cmsvvxjz701jj85sjsgry1w7i',
  'cmsvvxjy301is85sj9hwtk2oo',
  'cmsvvxk4d01my85sj9pwl62jj',
  'cmsvvxjyg01j185sjngmjq5dn',
  'cmsvvxjx201i185sj381678np',
  'cmsvvxhl1005385sjcgsp3u54',
  'cmsvvxk1k01l485sj6vrzqyxt',
  'cmsvvxhwl00b085sjez8s3ji4',
  'cmsvvxho7006o85sj0tcwgzrs',
  'cmsvvxhu9009r85sjbn7dglug',
];
const uniqueIds = [...new Set(entityIds.map((x) => x.replaceAll(' ', '')))];
const ids = uniqueIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM(SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD'),'[]'::json) AS periods,COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTIST'),'[]'::json) AS artists,COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND a.type='ARTWORK'),'[]'::json) AS artworks,COALESCE((SELECT json_agg(DISTINCT m.title ORDER BY m.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" m ON m.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND m.type='MOVEMENT'),'[]'::json) AS movements FROM "Entity" e WHERE e.id IN(${ids}) AND e.type='CONCEPT' AND e.status='PUBLISHED')x`,
    ),
  ) || [];
if (rows.length !== uniqueIds.length)
  throw new Error(`Expected ${uniqueIds.length} concept entities, got ${rows.length}`);
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-010.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_010', selection: '27 published concepts missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_010: updated ${out.length} English essays transactionally.`,
);
