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
const relationIds = [
  'cmsvvxluh02dl85sj3896u4rk',
  'cmsvvxlv202du85sjeogmki3l',
  'cmsvvxlx602er85sjdv6s9qe2',
  'cmsvvxmqc02r785sjubw2lkhj',
  'cmsvvxlza02fn85sjqu9nwpg9',
  'cmsvvxlzz02fx85sjezmni1e8',
  'cmsvvxm1b02gh85sjthqwpn0i',
  'cmsvvxm1k02gl85sjynbberoa',
  'cmsvvxm2202gs85sjt9gs2ifc',
  'cmsvvxmqe02r885sj10ki3021',
  'cmsvvxnv8037p85sjko5c6rip',
  'cmsvvxnva037q85sjle04dcli',
  'cmsvvxo3503b485sjlm507uju',
  'cmsvvxo3803b585sjbeo2nf8f',
  'cmtfo80uw01to01pbrs9eo8lt',
  'cmsvvxnxm038o85sjem599o3r',
  'cmsvvxo3e03b885sjj3wkypkj',
  'cmtfo80kf01tl01pbgh2w9de5',
  'cmsvvxlks029i85sjmx049xvf',
  'cmsvvxlrm02cc85sj8banlbhh',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId",a.title AS "fromTitle",b.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Citation" c JOIN "Source" s ON s.id=c."sourceId" WHERE c."relationId"=r.id),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "RelationType" rt ON rt.id=r."relationTypeId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(
    `Expected ${relationIds.length} published ABOUT_CONCEPT relations, got ${rows.length}`,
  );
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const es = `La relación vincula ${r.fromTitle} con ${r.toTitle} como marco interpretativo concreto: el concepto ofrece una vía para leer un aspecto de la entidad relacionada sin reducirla a una única interpretación. La asociación publicada funciona como orientación temática, no como afirmación de influencia o identidad.`;
  const en = `The relation connects ${r.fromTitle} with ${r.toTitle} as a specific interpretive frame: the concept offers one way to read an aspect of the related entity without reducing it to a single interpretation. The published association is thematic guidance, not a claim of influence or identity.`;
  const claims = [
    'relation:ABOUT_CONCEPT',
    `subject:${r.fromTitle}`,
    `concept:${r.toTitle}`,
    'scope:interpretive-association',
  ];
  const note =
    'Batch 040: replaced generic concept-link wording with a relation-specific interpretive justification; association remains non-causal and non-exclusive.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locale === 'es' ? es : en)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: { es, en }, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-040.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_040', selection: '20 ABOUT_CONCEPT relations with generic justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 040: applied ${out.length} ABOUT_CONCEPT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
