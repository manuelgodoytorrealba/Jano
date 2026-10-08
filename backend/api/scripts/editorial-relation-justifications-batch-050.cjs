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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.slug AS "fromSlug", a.title AS "fromTitle", a.type AS "fromType", b.slug AS "toSlug", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='BELONGS_TO_MOVEMENT' AND length(j.text)<=180 ORDER BY a.slug,b.slug OFFSET 40 LIMIT 20) x`,
    ),
  ) || [];
if (rows.length !== 20)
  throw new Error(`Expected 20 short BELONGS_TO_MOVEMENT relations, got ${rows.length}`);

const wording = (r) => {
  const subjectEs =
    r.fromType === 'ARTIST' ? `La práctica de ${r.fromTitle}` : `La entidad ${r.fromTitle}`;
  const subjectEn =
    r.fromType === 'ARTIST' ? `${r.fromTitle}'s practice` : `The entity ${r.fromTitle}`;
  return {
    es: `${subjectEs} se sitúa en relación con ${r.toTitle} porque comparte o dialoga con un marco histórico, formal o cultural asociado a ese movimiento. La relación ayuda a investigar cómo se concreta esa pertenencia en la obra o trayectoria registrada, pero no afirma que el movimiento explique por completo la entidad ni que sea su única adscripción posible.`,
    en: `${subjectEn} is related to ${r.toTitle} because it shares or engages with a historical, formal or cultural framework associated with that movement. The relation supports research into how this connection appears in the recorded work or trajectory, but it does not claim that the movement fully explains the entity or is its only possible affiliation.`,
  };
};
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:historical-and-formal-context',
    'claim:no-exclusive-affiliation',
  ];
  const note =
    'Batch 050: expanded short BELONGS_TO_MOVEMENT wording with entity-specific historical and formal scope; no exclusive affiliation claim added.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-050.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_050', selection: 'Next 20 short BELONGS_TO_MOVEMENT justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 050: applied ${out.length} BELONGS_TO_MOVEMENT relations / ${out.length * 2} bilingual justifications transactionally.`,
);
