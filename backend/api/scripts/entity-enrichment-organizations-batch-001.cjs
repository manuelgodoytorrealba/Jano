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
  'cmsvvxi4800ep85sjoxbhtxej',
  'cmsvvxi4300em85sjnj3gwd29',
  'cmsvvxiy100w185sjhsevdn77',
  'cmsvvxiy900w785sjy1u96ftq',
  'cmsvvxixw00vy85sjvc0tfssz',
  'cmsvvxi2d00e085sjrwt82bh4',
  'cmsvvxi2w00e985sj5mewownr',
  'cmsvvxi3200ec85sj8aveh8am',
  'cmsvvxixh00vp85sjunuw8if6',
  'cmsvvxi2400dx85sjopgm6asm',
  'cmsvvxixn00vs85sjkuj79wst',
  'cmsvvxixr00vv85sj1g5i2c6q',
  'cmsvvxiye00wa85sjx7iydl8z',
  'cmsvvxi3z00ej85sjam04j4pg',
  'cmsvvxi2q00e685sjf2tqh8cw',
  'cmsvvxi3u00eg85sjgmtx0fqu',
  'cmsvvxi2j00e385sjj1g4wmq2',
  'cmtptpmic0004gxss663i2bd7',
];
const ids = entityIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM(SELECT e.id,e.slug,e.title,COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" s ON s.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='LOCATED_IN'),'[]'::json) AS works,COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" s ON s.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='ASSOCIATED_WITH'),'[]'::json) AS concepts FROM "Entity" e WHERE e.id IN(${ids}) AND e.type='ORGANIZATION' AND e.status='PUBLISHED')x`,
    ),
  ) || [];
if (rows.length !== entityIds.length)
  throw new Error(`Expected ${entityIds.length} organization entities, got ${rows.length}`);
const join = (a) =>
  a.length === 0 ? '' : a.length === 1 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const essay = (r) => {
  const w = join((r.works || []).slice(0, 8)),
    c = join((r.concepts || []).slice(0, 8));
  const l = [
    '## Context',
    '',
    `${r.enTitle} is presented as an institution or cultural organization whose role is shaped by its collections, practices and public context. The entry keeps the description proportionate to the published evidence.`,
    '',
    '## Reading relationships',
  ];
  if (w)
    l.push(
      '',
      `Published relationships with ${w} provide concrete points of entry into its cultural activity.`,
    );
  if (c) l.push('', `Its connections with ${c} offer additional interpretive context.`);
  l.push(
    '',
    '## How to continue',
    '',
    `The exploration should continue through the works, concepts and sources attached to this organization. These relationships make the available evidence visible; broader institutional claims require additional review and attributable documentation.`,
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
  'artifacts/editorial-recovery/entity-enrichment-organizations-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_ORGANIZATIONS_001', selection: '18 published organizations missing English essay', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_ORGANIZATIONS_001: updated ${out.length} English essays transactionally.`,
);
