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
      `SELECT json_agg(row_to_json(x)) FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", b.title AS "toTitle" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j_es ON j_es."relationId"=r.id AND j_es.locale='es' AND j_es.status='APPROVED' JOIN "EditorialRelationJustification" j_en ON j_en."relationId"=r.id AND j_en.locale='en' AND j_en.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='LOCATED_IN' AND (length(j_es.text)<=180 OR length(j_en.text)<=180)) x`,
    ),
  ) || [];
if (rows.length !== 2) throw new Error(`Expected 2 short LOCATED_IN relations, got ${rows.length}`);

const textFor = (r) => ({
  es: `La relación sitúa ${r.fromTitle} en ${r.toTitle} como localización registrada en el catálogo. Este vínculo permite investigar el espacio geográfico o institucional y su función de conservación, exhibición o contexto, sin asumir que el lugar agote la historia de la entidad ni que permanezca invariable en el tiempo.`,
  en: `The relation places ${r.fromTitle} in ${r.toTitle} as a location recorded in the catalogue. This link supports research into the geographical or institutional space and its role in preservation, exhibition or context, without treating the location as the whole history of the entity or assuming it remains unchanged over time.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const locales = textFor(r);
  const claims = [
    'relation:LOCATED_IN',
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:geographical-or-institutional-location',
    'claim:not-exhaustive-location',
  ];
  const note =
    'Batch 087: final LOCATED_IN quality pass; expanded short wording with geographical and institutional scope and no immutable-location claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-087.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_087', selection: 'Final short LOCATED_IN justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 087: applied ${out.length} LOCATED_IN relations / ${out.length * 2} bilingual justifications transactionally.`,
);
