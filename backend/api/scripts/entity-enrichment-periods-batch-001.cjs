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

const periods = {
  antiguedad: {
    title: 'Antiquity',
    framing:
      'a long historical horizon associated with ancient societies, artistic traditions and material cultures before the medieval period',
  },
  'edad-antigua': {
    title: 'Ancient History',
    framing:
      'the historical period conventionally placed between the emergence of writing and the transformation of the ancient Mediterranean world',
  },
  'edad-contemporanea': {
    title: 'Contemporary History',
    framing:
      'the period beginning with the late eighteenth-century revolutions and extending into the present',
  },
  'edad-media': {
    title: 'Middle Ages',
    framing:
      'the period between the ancient and modern worlds, conventionally dated from late antiquity to the fifteenth century',
  },
  'edad-moderna': {
    title: 'Early Modern Period',
    framing:
      'the period that links the Renaissance and the eighteenth century with major changes in European society, science and political thought',
  },
  neolitico: {
    title: 'Neolithic',
    framing:
      'the prehistoric period associated with settled communities, cultivation, new technologies and changing forms of material culture',
  },
  paleolitico: {
    title: 'Paleolithic',
    framing:
      'the long prehistoric period associated with hunter-gatherer societies, stone technologies and some of the earliest known visual practices',
  },
  prehistoria: {
    title: 'Prehistory',
    framing:
      'the broad period before written records, reconstructed through archaeology, material remains and visual culture',
  },
  renacimiento: {
    title: 'Renaissance',
    framing:
      'the period associated with renewed engagement with classical antiquity and major transformations in European art, learning and patronage',
  },
  'siglo-xix': {
    title: 'Nineteenth Century',
    framing:
      'the century marked by industrialisation, revolution, empire and competing artistic responses to modern social life',
  },
  'siglo-xx': {
    title: 'Twentieth Century',
    framing:
      'the century in which modernism, the historical avant-gardes and new media reshaped artistic practice',
  },
  'siglo-xxi': {
    title: 'Twenty-First Century',
    framing:
      'the current period, in which artistic practices develop through global networks, digital media and hybrid forms of circulation',
  },
};

const slugs = Object.keys(periods);
const ids = slugs.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,e."startYear",e."endYear",COALESCE((SELECT et.title FROM "EntityTranslation" et WHERE et."entityId"=e.id AND et.locale='en'),e.title) AS "enTitle",COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD' AND a.type='MOVEMENT'),'[]'::json) AS movements,COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD' AND a.type IN ('ARTIST','ARTWORK')),'[]'::json) AS examples FROM "Entity" e WHERE e.slug IN (${ids}) AND e.type='PERIOD' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published periods, got ${rows.length}`);

const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const yearRange = (r) => {
  if (r.startYear === null && r.endYear === null) return '';
  if (r.endYear === null) return `from ${r.startYear}`;
  if (r.startYear === r.endYear) return `in ${r.startYear}`;
  return `from ${r.startYear} to ${r.endYear}`;
};
const essayFor = (r) => {
  const p = periods[r.slug];
  const movements = natural((r.movements || []).slice(0, 8));
  const examples = natural((r.examples || []).slice(0, 8));
  const lines = [
    '## Chronological frame',
    '',
    `${p.title} is presented as ${p.framing}${yearRange(r) ? `, conventionally situated ${yearRange(r)}` : ''}. The dates provide an organising frame rather than a claim that cultural change happened uniformly across all regions.`,
    '',
    '## Reading relationships',
  ];
  if (movements)
    lines.push(
      '',
      `Published relationships connect this period with ${movements}. These movements make it possible to study how artistic languages respond to, inherit from or challenge broader historical conditions.`,
    );
  if (examples)
    lines.push('', `The catalogue also offers concrete points of entry through ${examples}.`);
  if (!movements && !examples)
    lines.push(
      '',
      'The period currently has few direct catalogue connections, so its entry should be read as a chronological orientation rather than as a complete account of its cultures.',
    );
  lines.push(
    '',
    '## How to continue',
    '',
    'Continue through the connected entities and sources attached to this period. More specific claims about geography, chronology or cultural transmission require attributable evidence and should not be inferred from the period label alone.',
  );
  return lines.join('\n');
};

const out = rows.map((r) => ({
  ...r,
  essay: essayFor(r),
  sourcesUsed: ['canonical period dates and published catalogue relationships'],
}));
let sql = 'BEGIN;';
for (const r of out)
  sql += `UPDATE "EntityTranslation" SET "essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-periods-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PERIODS_001', selection: '12 published periods missing English essay', rows: out }, null, 2)}\n`,
);
console.log(`ENTITY_ENRICHMENT_PERIODS_001: updated ${out.length} English essays transactionally.`);
