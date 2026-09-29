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
  'cmsvvxiyj00wd85sjnextjlrt',
  'cmsvvxhyo00c385sjn5rt6xz6',
  'cmsvvxj0d00xj85sjzd429xqb',
  'cmsvvxhxt00bl85sj0rh403w6',
  'cmsvvxhzr00co85sjcfuq1by1',
  'cmsvvxi1400df85sjlwb8z9ef',
  'cmsvvxi1x00du85sjnmymjxqy',
  'cmsvvxhz000c985sjdktcnz6g',
  'cmsvvxk4q01n785sjla1ppdac',
  'cmsvvxj0m00xp85sj3jx6d9on',
  'cmsvvxk5901nj85sjru9btzaj',
  'cmsvvxizz00xa85sjqbj4lavy',
  'cmsvvxi0i00d385sja4d3zjjt',
  'cmtaf2hm5000a07qta5w5wnr9',
  'cmsvvxhzm00cl85sjr88ve7gd',
  'cmsvvxi0n00d685sju76dfqnm',
  'cmsvvxiyo00wg85sjdmv4h6sl',
  'cmsvvxi1s00dr85sjv68amnof',
  'cmsvvxi0d00d085sja3r1ykyl',
  'cmsvvxi0y00dc85sj8fh69jxg',
];
const ids = entityIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM(SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" s ON s.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='LOCATED_IN'),'[]'::json) AS sources,COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" s ON s.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='LOCATED_IN' AND s.type='ORGANIZATION'),'[]'::json) AS organizations FROM "Entity" e WHERE e.id IN(${ids}) AND e.type='PLACE' AND e.status='PUBLISHED')x`,
    ),
  ) || [];
if (rows.length !== entityIds.length)
  throw new Error(`Expected ${entityIds.length} place entities, got ${rows.length}`);
const join = (a) =>
  a.length === 0 ? '' : a.length === 1 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const essay = (r) => {
  const s = join((r.sources || []).slice(0, 8)),
    o = join((r.organizations || []).slice(0, 8));
  const l = [
    '## Context',
    '',
    `${r.enTitle} is presented as a cultural and geographic setting whose significance depends on the histories, institutions and works connected to it. The entry avoids reducing the place to a single identity.`,
    '',
    '## Reading relationships',
  ];
  if (o)
    l.push(
      '',
      `Published institutional relationships with ${o} provide concrete points of reference.`,
    );
  if (s) l.push('', `${s} connect the place with documented works and entities in the catalogue.`);
  l.push(
    '',
    '## How to continue',
    '',
    `The exploration should continue through the entities and sources attached to this place. These relationships make the available evidence visible; broader historical claims require additional review and attributable documentation.`,
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
  'artifacts/editorial-recovery/entity-enrichment-places-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PLACES_001', selection: '20 published places missing English essay', rows: out }, null, 2)}\n`,
);
console.log(`ENTITY_ENRICHMENT_PLACES_001: updated ${out.length} English essays transactionally.`);
