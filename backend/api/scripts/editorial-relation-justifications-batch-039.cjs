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
  'cmsvvxo0l039y85sjhte7s7xa',
  'cmsvvxo0n039z85sjcyk0gbo9',
  'cmsvvxo2303am85sjye9fa9bg',
  'cmsvvxo2503an85sjvbwdnam0',
  'cmsvvxlud02dj85sjdizfwkm5',
  'cmsvvxnw5038385sjor91tb3j',
  'cmsvvxmhp02n985sj6s9hk48k',
  'cmsvvxnw7038485sjputibk28',
  'cmtaf2hpl001y07qtfd9wa31s',
  'cmsvvxntr037385sjlb8u17qp',
  'cmsvvxo1e03aa85sjl19ach5y',
  'cmsvvxo1h03ab85sjjzk8aan2',
  'cmsvvxlq302bo85sj7bmp3gl8',
  'cmsvvxo1903a885sjf27y800t',
  'cmsvvxo1c03a985sjime041nb',
  'cmsvvxo1s03ag85sjjro7zg64',
  'cmsvvxlve02dz85sjkv0t8geu',
  'cmsvvxm0d02g385sjaxaulmij',
  'cmsvvxo1u03ah85sjyimskk6x',
  'cmsvvxlyj02fc85sjcibh7kw9',
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
    'Batch 039: replaced generic concept-link wording with a relation-specific interpretive justification; association remains non-causal and non-exclusive.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locale === 'es' ? es : en)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: { es, en }, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-039.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_039', selection: '20 ABOUT_CONCEPT relations with generic justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 039: applied ${out.length} ABOUT_CONCEPT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
