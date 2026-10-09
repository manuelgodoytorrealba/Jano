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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.slug AS "fromSlug", a.title AS "fromTitle", a.type AS "fromType", b.slug AS "toSlug", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='CREATED_BY' AND length(j.text)<=180 ORDER BY a.slug,b.slug LIMIT 20) x`,
    ),
  ) || [];
if (rows.length !== 20)
  throw new Error(`Expected 20 short CREATED_BY relations, got ${rows.length}`);

const wording = (r) => ({
  es: `La relación atribuye ${r.fromTitle} a ${r.toTitle} como vínculo de autoría registrado en el catálogo. Permite estudiar la obra o entidad junto a la trayectoria, decisiones y contexto del artista, sin asumir que la atribución agote su interpretación ni que descarte colaboraciones, talleres o debates históricos sobre autoría.`,
  en: `The relation attributes ${r.fromTitle} to ${r.toTitle} as an authorship link recorded in the catalogue. It supports studying the work or entity alongside the artist’s trajectory, decisions and context, without treating the attribution as exhaustive or excluding collaborations, workshops or historical debates about authorship.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:catalogue-authorship',
    'claim:no-exclusive-authorship',
  ];
  const note =
    'Batch 062: expanded short CREATED_BY wording with catalogue authorship scope; collaboration and attribution uncertainty remain open where relevant.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-062.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_062', selection: 'Next 20 short CREATED_BY justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 062: applied ${out.length} CREATED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
