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

const people = {
  'agustin-de-hipona': {
    title: 'Augustine of Hippo',
    framing:
      'a late-antique Christian thinker whose writings shaped theological, philosophical and cultural debates across medieval Europe',
  },
  aristoteles: {
    title: 'Aristotle',
    framing:
      'a Greek philosopher whose work addressed ethics, politics, poetics, natural philosophy and the organisation of knowledge',
  },
  homer: {
    title: 'Homer',
    framing:
      'the traditional name associated with the Iliad and the Odyssey and with foundational traditions of Greek epic poetry',
  },
  'plinio-el-viejo': {
    title: 'Pliny the Elder',
    framing:
      'a Roman author and naturalist whose encyclopaedic writings preserve knowledge about nature, art, materials and the ancient world',
  },
  sophocles: {
    title: 'Sophocles',
    framing:
      'a Greek tragedian whose dramas became central reference points for the history of theatre and classical representation',
  },
  vitruvio: {
    title: 'Vitruvius',
    framing:
      'a Roman architect and writer whose treatise connected architecture with craft, proportion, materials and broader systems of knowledge',
  },
};
const slugs = Object.keys(people);
const ids = slugs.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,e."startYear",e."endYear",COALESCE((SELECT json_agg(DISTINCT a.title ORDER BY a.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" WHERE r."toId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS incoming,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" t ON t.id=r."toId" WHERE r."fromId"=e.id AND r.status='PUBLISHED'),'[]'::json) AS outgoing FROM "Entity" e WHERE e.slug IN (${ids}) AND e.type='PERSON' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published people, got ${rows.length}`);

const natural = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const formatYear = (year) => (year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`);
const yearRange = (r) =>
  r.startYear === null && r.endYear === null
    ? ''
    : r.endYear === null
      ? `around ${formatYear(r.startYear)}`
      : `from ${formatYear(r.startYear)} to ${formatYear(r.endYear)}`;
const essayFor = (r) => {
  const p = people[r.slug];
  const incoming = natural((r.incoming || []).slice(0, 8));
  const outgoing = natural((r.outgoing || []).slice(0, 8));
  const lines = [
    '## Historical frame',
    '',
    `${p.title} is presented as ${p.framing}${yearRange(r) ? `, conventionally dated ${yearRange(r)}` : ''}. The dates and attribution are used as a catalogue orientation, not as a complete biography.`,
    '',
    '## Reading relationships',
  ];
  if (incoming) lines.push('', `Published relationships connect this person with ${incoming}.`);
  if (outgoing)
    lines.push(
      '',
      `The catalogue also points toward ${outgoing}, making the person's place in the connected history of art visible.`,
    );
  if (!incoming && !outgoing)
    lines.push(
      '',
      'The person currently has few direct catalogue connections, so the entry should be read as a concise orientation to the canonical record.',
    );
  lines.push(
    '',
    '## How to continue',
    '',
    'Continue through the connected entities and sources attached to this person. More specific claims about authorship, influence or reception require attributable evidence beyond the name and dates.',
  );
  return lines.join('\n');
};

const out = rows.map((r) => ({
  ...r,
  enTitle: people[r.slug].title,
  essay: essayFor(r),
  sourcesUsed: ['canonical person dates and published catalogue relationships'],
}));
let sql = 'BEGIN;';
for (const r of out)
  sql += `UPDATE "EntityTranslation" SET "title"=${q(r.enTitle)},"essay"=${q(r.essay)},"updatedAt"=CURRENT_TIMESTAMP WHERE "entityId"=${q(r.id)} AND locale='en';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-persons-batch-001.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PERSONS_001', selection: '6 published people missing English essay', rows: out }, null, 2)}\n`,
);
console.log(`ENTITY_ENRICHMENT_PERSONS_001: updated ${out.length} English essays transactionally.`);
