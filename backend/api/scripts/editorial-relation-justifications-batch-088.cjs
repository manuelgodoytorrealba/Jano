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
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x)) FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", b.title AS "toTitle" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j_es ON j_es."relationId"=r.id AND j_es.locale='es' AND j_es.status='APPROVED' JOIN "EditorialRelationJustification" j_en ON j_en."relationId"=r.id AND j_en.locale='en' AND j_en.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='INFLUENCED_BY' AND (length(j_es.text)<=180 OR length(j_en.text)<=180)) x`,
    ),
  ) || [];
if (rows.length !== 1)
  throw new Error(`Expected 1 short INFLUENCED_BY relation, got ${rows.length}`);

const r = rows[0];
const es = `La relación vincula Cubismo con Paul Cézanne como una influencia histórica y formal documentada en el catálogo. Permite estudiar cómo ciertas investigaciones sobre estructura, forma y percepción pudieron abrir caminos para el movimiento, sin convertir la influencia en una causa única, lineal o determinante de su desarrollo.`;
const en = `The relation connects Cubism with Paul Cézanne as a historical and formal influence recorded in the catalogue. It supports studying how investigations into structure, form and perception may have opened paths for the movement, without treating influence as a single, linear or determining cause of its development.`;
const claims = [
  'relation:INFLUENCED_BY',
  'from:Cubismo',
  'to:Paul Cézanne',
  'scope:historical-and-formal-influence',
  'claim:no-linear-causality',
];
const note =
  'Batch 088: final relation-justification pass; expanded influence wording with historical and formal scope and no linear-causality claim.';
let sql = 'BEGIN;';
for (const [locale, text] of [
  ['es', es],
  ['en', en],
])
  sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-088.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_088', selection: 'Final short INFLUENCED_BY justification', rows: [{ ...r, locales: { es, en }, claims, sources: [] }] }, null, 2)}\n`,
);
console.log(
  'Batch 088: applied 1 INFLUENCED_BY relation / 2 bilingual justifications transactionally.',
);
