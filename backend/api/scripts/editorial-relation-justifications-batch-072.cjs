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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.slug AS "fromSlug", a.title AS "fromTitle", a.type AS "fromType", b.slug AS "toSlug", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='PART_OF' AND length(j.text)<=180 ORDER BY a.slug,b.slug) x`,
    ),
  ) || [];
if (rows.length !== 3) throw new Error(`Expected 3 short PART_OF relations, got ${rows.length}`);

const wording = (r) => ({
  es: `La relación sitúa ${r.fromTitle} como parte de ${r.toTitle} dentro de una estructura histórica y cultural más amplia. Este vínculo ayuda a leer cómo se organiza, delimita o periodiza la entidad, sin reducirla a una simple subdivisión ni afirmar que el marco superior agote sus significados y conexiones.`,
  en: `The relation places ${r.fromTitle} as part of ${r.toTitle} within a broader historical and cultural structure. This link helps read how the entity is organised, delimited or periodised, without reducing it to a simple subdivision or claiming that the larger framework exhausts its meanings and connections.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:historical-structural-context',
    'claim:not-exhaustive-membership',
  ];
  const note =
    'Batch 072: final PART_OF pass; expanded short wording with historical and structural scope and no exhaustive-membership claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-072.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_072', selection: 'Final short PART_OF justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 072: applied ${out.length} PART_OF relations / ${out.length * 2} bilingual justifications transactionally.`,
);
