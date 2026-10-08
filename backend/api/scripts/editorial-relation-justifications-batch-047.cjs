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
      `SELECT json_agg(row_to_json(x)) FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", b.title AS "toTitle" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND (a.type='CONCEPT' OR b.type='CONCEPT') AND length(j.text)<=180) x`,
    ),
  ) || [];
if (rows.length !== 1)
  throw new Error(`Expected 1 short concept-related justification, got ${rows.length}`);

const r = rows[0];
const es = `La relación vincula Graffiti y Espacios Educativos con Juventud porque sitúa las prácticas de inscripción y creación en el espacio público dentro de experiencias generacionales de participación, pertenencia y aprendizaje. El vínculo orienta una lectura social y pedagógica del proyecto, sin afirmar que toda práctica juvenil sea graffiti ni que exista una causalidad única entre ambos referentes.`;
const en = `The relation connects Graffiti y Espacios Educativos with Juventud because it places inscription and making practices in public space within generational experiences of participation, belonging and learning. The link offers a social and pedagogical reading of the project without claiming that every youth practice is graffiti or that a single causal relation exists between the two references.`;
const claims = [
  'relation:RELATED_TO',
  'from:Graffiti y Espacios Educativos',
  'to:Juventud',
  'scope:social-and-pedagogical-context',
  'claim:no-exclusive-causality',
];
const note =
  'Batch 047: replaced the remaining short generic concept-related justification with a specific social and pedagogical scope; no unsupported causal claim added.';
let sql = 'BEGIN;';
for (const [locale, text] of [
  ['es', es],
  ['en', en],
])
  sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-047.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_047', selection: 'Remaining short concept-related justification', rows: [{ ...r, locales: { es, en }, claims, sources: [] }] }, null, 2)}\n`,
);
console.log(
  'Batch 047: applied 1 concept-related relation / 2 bilingual justifications transactionally.',
);
