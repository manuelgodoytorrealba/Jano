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
  'cmsvvxj0v00xv85sjdze4kxw5',
  'cmsvvxhlj005c85sjmtbebksk',
  'cmsvvxhox007385sjczkyuxkk',
  'cmsvvxhq6007r85sjaa6vsgov',
  'cmsvvxjw001ha85sjag7k1stb',
  'cmsvvxht3009685sjspk3x7rg',
  'cmsvvxk1y01ld85sjp1qbpspx',
  'cmsvvxjxn01ig85sj5onz2m1b',
  'cmsvvxk1101ks85sj250fpg7l',
  'cmt0h5a11002y07p5p0yp4p4j',
  'cmsvvxjzc01jm85sj7z346jqp',
  'cmsvvxhvy00ao85sja9khylgp',
  'cmsvvxjt601fg85sj2bi0yk8f',
  'cmsvvxhul009x85sjnd4qpfd1',
  'cmsvvxho1006l85sjw7fv4udy',
  'cmsvvxjtf01fm85sjgi72rx58',
  'cmsvvxhvr00al85sjkp5wqq2n',
  'cmsvvxhsd008u85sjhemvxbix',
  'cmsvvxhpd007c85sjtzihcxt1',
  'cmsvvxhvi00af85sj2d6e3ps6',
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
  'artifacts/editorial-recovery/entity-enrichment-concepts-batch-005.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_CONCEPTS_005', selection: '20 published concepts missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_CONCEPTS_005: updated ${out.length} English essays transactionally.`,
);
