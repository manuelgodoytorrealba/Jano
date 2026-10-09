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
      `SELECT json_agg(row_to_json(x)) FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", a.type AS "fromType", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='ASSOCIATED_WITH' AND length(j.text)<=180) x`,
    ),
  ) || [];
if (rows.length !== 1)
  throw new Error(`Expected 1 short ASSOCIATED_WITH relation, got ${rows.length}`);

const r = rows[0];
const es = `La relación asocia ${r.fromTitle} con ${r.toTitle} como conexión histórica y contextual publicada. Permite leer la obra junto al conflicto, las experiencias sociales y los marcos de memoria vinculados a la Guerra Civil española, sin afirmar por sí sola una intención política única, causalidad directa ni equivalencia entre la obra y el acontecimiento.`;
const en = `The relation associates ${r.fromTitle} with ${r.toTitle} as a published historical and contextual connection. It allows the work to be read alongside the conflict, social experiences and memory frameworks linked to the Spanish Civil War, without claiming a single political intention, direct causality or equivalence between the work and the event.`;
const claims = [
  'relation:ASSOCIATED_WITH',
  'from:Guernica',
  'to:Guerra civil española',
  'scope:historical-and-memory-context',
  'claim:no-exclusive-causality',
];
const note =
  'Batch 073: final relation-justification pass; replaced short generic wording with historical and memory context and no unsupported causal claim.';
let sql = 'BEGIN;';
for (const [locale, text] of [
  ['es', es],
  ['en', en],
])
  sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-073.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_073', selection: 'Final short ASSOCIATED_WITH justification', rows: [{ ...r, locales: { es, en }, claims, sources: [] }] }, null, 2)}\n`,
);
console.log(
  'Batch 073: applied 1 ASSOCIATED_WITH relation / 2 bilingual justifications transactionally.',
);
