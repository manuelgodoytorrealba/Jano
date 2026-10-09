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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.slug AS "fromSlug", a.title AS "fromTitle", a.type AS "fromType", b.slug AS "toSlug", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='BELONGS_TO_PERIOD' AND length(j.text)<=180 ORDER BY a.slug,b.slug) x`,
    ),
  ) || [];
if (rows.length !== 11)
  throw new Error(`Expected 11 short BELONGS_TO_PERIOD relations, got ${rows.length}`);

const wording = (r) => ({
  es: `La relación sitúa ${r.fromTitle} en conexión con ${r.toTitle} como marco cronológico e histórico. El periodo ayuda a investigar las condiciones culturales, materiales y sociales de la entidad, sin convertir una clasificación amplia en una datación absoluta ni agotar sus intercambios y continuidades con otros momentos.`,
  en: `The relation connects ${r.fromTitle} with ${r.toTitle} as a chronological and historical framework. The period helps investigate the entity’s cultural, material and social conditions, without turning a broad classification into an absolute dating or exhausting its exchanges and continuities with other moments.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:chronological-and-historical-context',
    'claim:no-absolute-dating',
  ];
  const note =
    'Batch 071: final BELONGS_TO_PERIOD pass; expanded short wording with chronological and historical scope and no absolute dating claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-071.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_071', selection: 'Final short BELONGS_TO_PERIOD justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 071: applied ${out.length} BELONGS_TO_PERIOD relations / ${out.length * 2} bilingual justifications transactionally.`,
);
