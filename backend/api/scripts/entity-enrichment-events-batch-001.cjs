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

const eventTitles = {
  'exposicion-armory-show': 'Armory Show',
  'guerra-civil-espanola': 'Spanish Civil War',
  'primera-guerra-mundial': 'First World War',
  '_wave002-87a4c47fed1aba8f': 'July Revolution of 1830',
  'revolucion-francesa': 'French Revolution',
  'revolucion-rusa': 'Russian Revolution',
  'segunda-guerra-mundial': 'Second World War',
  '_wave002-88e68a350ae62f81': 'The Last Picture Show: Artists Using Photography, 1960–1982',
  '_wave002-fa8862ede5a584e2': 'The Quick and the Dead',
  '_wave002-c9738c77caaa7eef': 'THINKING AHEAD: Progressive Design + Black Mountain College',
};
const slugs = Object.keys(eventTitles);
const ids = slugs.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,e."startYear",e."endYear",COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS incoming,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS outgoing FROM "Entity" e WHERE e.slug IN (${ids}) AND e.type='EVENT' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published events, got ${rows.length}`);

const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const yearRange = (r) => {
  if (r.startYear === null && r.endYear === null) return '';
  if (r.endYear === null) return `in ${r.startYear}`;
  if (r.startYear === r.endYear) return `in ${r.startYear}`;
  return `from ${r.startYear} to ${r.endYear}`;
};
const essayFor = (r) => {
  const title = eventTitles[r.slug];
  const incoming = natural((r.incoming || []).slice(0, 8));
  const outgoing = natural((r.outgoing || []).slice(0, 8));
  const isResearchEvent = r.slug.startsWith('_wave002-');
  const lines = [
    '## Event frame',
    '',
    `${title} is treated as a documented event in the catalogue${yearRange(r) ? `, dated ${yearRange(r)}` : ''}. ${isResearchEvent ? 'Because this record comes from a research-oriented exhibition or programme, the entry describes its documented scope without turning the title alone into a broader historical claim.' : 'The date provides an organising point for historical reading, while the event remains connected to the specific people, works and movements documented around it.'}`,
    '',
    '## Reading relationships',
  ];
  if (incoming) lines.push('', `Published relationships connect the event with ${incoming}.`);
  if (outgoing) lines.push('', `It also opens paths toward ${outgoing}.`);
  if (!incoming && !outgoing)
    lines.push(
      '',
      'The event currently has few direct catalogue connections, so its entry should be read as a precise orientation to the record rather than as a complete history of its context.',
    );
  lines.push(
    '',
    '## How to continue',
    '',
    'Continue through the connected entities and sources attached to this event. Claims about causes, participants or wider historical effects require attributable evidence beyond the event label and date.',
  );
  return lines.join('\n');
};

const out = rows.map((r) => ({
  ...r,
  enTitle: eventTitles[r.slug],
  essay: essayFor(r),
  sourcesUsed: ['canonical event dates and published catalogue relationships'],
}));
let sql = 'BEGIN;';
for (const r of out) {
  sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","createdAt","updatedAt") VALUES (md5(${q(r.id + ':en')}),${q(r.id)},'en',${q(r.enTitle)},NULL,${q(r.essay)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "title"=EXCLUDED."title","essay"=EXCLUDED."essay","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-events-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_EVENTS_001', selection: '10 published events missing English essay', rows: out }, null, 2)}\n`,
);
console.log(`ENTITY_ENRICHMENT_EVENTS_001: updated ${out.length} English essays transactionally.`);
