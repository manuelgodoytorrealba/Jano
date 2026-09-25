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
const relationId = 'cmtikq6kj000bvifprd0td82v';
const row = JSON.parse(
  db(
    `SELECT row_to_json(x) FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",r.justification AS canonical_justification,COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Citation" c JOIN "Source" s ON s.id=c."sourceId" WHERE c."relationId"=r.id),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id='${relationId}' AND r.status='PUBLISHED') x`,
  ),
);
if (!row) throw new Error('Selected relation not found');
const locales = {
  es: 'La relación reconoce que el Cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne, especialmente por su exploración de los puntos de vista y la construcción de la forma.',
  en: 'The relation recognises that Cubism was partly influenced by the late work of Paul Cézanne, particularly by his exploration of viewpoints and the construction of form.',
};
const claims = [
  'relation:INFLUENCED_BY',
  'canonical-justification:explicit-causal-claim',
  'published-entities:cubismo,paul-cezanne',
];
const sources = row.sources;
const note =
  'Batch 026: única relación INFLUENCED_BY promovida tras auditoría por contar con justificación canónica específica y fuente directamente asociada; las demás quedan en revisión.';
let sql = 'BEGIN;';
for (const locale of ['es', 'en'])
  sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(relationId + locale)}),${q(relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-026.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_026', selection: '1 INFLUENCED_BY relation with explicit canonical causal support', row, locales, claims, sources }, null, 2)}\n`,
);
console.log(
  'Batch 026: applied 1 INFLUENCED_BY relation / 2 bilingual justifications transactionally.',
);
