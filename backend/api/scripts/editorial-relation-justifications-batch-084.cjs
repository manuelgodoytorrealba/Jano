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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", a.type AS "fromType", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j_es ON j_es."relationId"=r.id AND j_es.locale='es' AND j_es.status='APPROVED' JOIN "EditorialRelationJustification" j_en ON j_en."relationId"=r.id AND j_en.locale='en' AND j_en.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='ABOUT_CONCEPT' AND (length(j_es.text)<=180 OR length(j_en.text)<=180) ORDER BY a.title,b.title LIMIT 20) x`,
    ),
  ) || [];
if (rows.length !== 20)
  throw new Error(`Expected 20 short ABOUT_CONCEPT relations, got ${rows.length}`);

const wording = (r) => ({
  es: `La relación vincula ${r.fromTitle} con ${r.toTitle} como marco conceptual concreto para orientar la lectura de la entidad. El concepto permite examinar un aspecto material, formal, histórico o social de la obra sin reducirla a una sola interpretación, intención autoral o definición temática.`,
  en: `The relation connects ${r.fromTitle} with ${r.toTitle} as a specific conceptual frame for reading the entity. The concept helps examine a material, formal, historical or social aspect of the work without reducing it to a single interpretation, authorial intention or thematic definition.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:conceptual-reading-frame',
    'claim:no-exclusive-interpretation',
  ];
  const note =
    'Batch 084: expanded short ABOUT_CONCEPT wording in whichever locale was below threshold; replaced generic scope with a concrete interpretive frame and no exclusive-interpretation claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-084.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_084', selection: 'Next 20 short ABOUT_CONCEPT justifications across either locale', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 084: applied ${out.length} ABOUT_CONCEPT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
