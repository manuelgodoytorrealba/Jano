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
  'cmsvvxm3702ha85sjbve0t9gw',
  'cmsvvxnt7036v85sjmwhwzzsp',
  'cmsvvxlwa02ee85sjbyn98bb7',
  'cmtfo80uy01tp01pbj7xl6ykb',
  'cmsvvxlw102ea85sjuo8yn59i',
  'cmsvvxlx402eq85sjt0p9h20s',
  'cmsvvxnvw037z85sjvu48mtus',
  'cmsvvxnvy038085sjzasug706',
  'cmsvvxlz502fl85sjvk00hz88',
  'cmsvvxm0602g085sj4qi4ntoi',
  'cmsvvxnxt038r85sjcn9d07pv',
  'cmsvvxm2k02h085sjibf8jy9a',
  'cmsvvxmi402nh85sjirstdvhd',
  'cmsvvxnu2037885sjoiha5k8t',
  'cmsvvxm2s02h485sjm7sn8ug0',
  'cmsvvxnt4036u85sjyqzefe2j',
  'cmsvvxluk02dn85sj9mf1x85v',
  'cmsvvxntj036z85sjmag8qmgd',
  'cmsvvxlvp02e485sj532k71e7',
  'cmsvvxlxi02ew85sj757tdgxp',
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
    'Batch 042: replaced generic concept-link wording with a relation-specific interpretive justification; association remains non-causal and non-exclusive.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locale === 'es' ? es : en)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: { es, en }, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-042.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_042', selection: '20 ABOUT_CONCEPT relations with generic justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 042: applied ${out.length} ABOUT_CONCEPT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
