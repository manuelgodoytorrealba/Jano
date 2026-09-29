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
  'cmsvvxi0100cu85sjp29nvcpq',
  'cmsvvxiyx00wm85sjx8kdpw7g',
  'cmsvvxhxo00bi85sjllzzrur7',
  'cmsvvxizv00x785sjrh5jgoba',
  'cmsvvxk4z01nd85sjpcyi4z67',
  'cmsvvxk5401ng85sjw1ggfkir',
  'cmsvvxi1n00do85sjdd8xf9na',
  'cmsvvxi1f00dl85sj9robf4kx',
  'cmsvvxhzw00cr85sjhh0q5zei',
  'cmsvvxi0t00d985sjcfl6lxbd',
  'cmsvvxhxx00bo85sjgpsmkghz',
  'cmsvvxhyu00c685sjkua2vzi1',
  'cmsvvxiz700ws85sj2ejrq49c',
  'cmsvvxiz200wp85sjhzojs2ac',
];
const ids = entityIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM(SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" s ON s.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='LOCATED_IN'),'[]'::json) AS sources FROM "Entity" e WHERE e.id IN(${ids}) AND e.type='PLACE' AND e.status='PUBLISHED')x`,
    ),
  ) || [];
if (rows.length !== entityIds.length)
  throw new Error(`Expected ${entityIds.length} place entities, got ${rows.length}`);
const join = (a) =>
  a.length === 0 ? '' : a.length === 1 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const essay = (r) => {
  const s = join((r.sources || []).slice(0, 8));
  const l = [
    '## Context',
    '',
    `${r.enTitle} is presented as a cultural and geographic setting whose significance depends on the histories, institutions and works connected to it. The entry avoids reducing the place to a single identity.`,
    '',
    '## Reading relationships',
  ];
  if (s) l.push('', `${s} connect the place with documented entities in the catalogue.`);
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
  'artifacts/editorial-recovery/entity-enrichment-places-batch-003.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PLACES_003', selection: '14 published places missing English essay', rows: out }, null, 2)}\n`,
);
console.log(`ENTITY_ENRICHMENT_PLACES_003: updated ${out.length} English essays transactionally.`);
