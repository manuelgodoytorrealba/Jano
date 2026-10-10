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
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", b.title AS "toTitle" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j_es ON j_es."relationId"=r.id AND j_es.locale='es' AND j_es.status='APPROVED' JOIN "EditorialRelationJustification" j_en ON j_en."relationId"=r.id AND j_en.locale='en' AND j_en.status='APPROVED' WHERE r.status='PUBLISHED' AND rt.key='CREATED_BY' AND (length(j_es.text)<=180 OR length(j_en.text)<=180)) x`,
    ),
  ) || [];
if (rows.length !== 9) throw new Error(`Expected 9 short CREATED_BY relations, got ${rows.length}`);

const textFor = (r) => ({
  es: `La relación atribuye ${r.fromTitle} a ${r.toTitle} como vínculo de autoría registrado en el catálogo. Permite estudiar la obra o entidad junto a la trayectoria, decisiones y contexto del artista, sin asumir que la atribución agote su interpretación ni que descarte colaboraciones, talleres o debates históricos sobre autoría.`,
  en: `The relation attributes ${r.fromTitle} to ${r.toTitle} as an authorship link recorded in the catalogue. It supports studying the work or entity alongside the artist’s trajectory, decisions and context, without treating the attribution as exhaustive or excluding collaborations, workshops or historical debates about authorship.`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const locales = textFor(r);
  const claims = [
    'relation:CREATED_BY',
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:catalogue-authorship',
    'claim:no-exclusive-authorship',
  ];
  const note =
    'Batch 086: final CREATED_BY quality pass; expanded short wording with catalogue authorship scope and no exclusive attribution claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-086.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_086', selection: 'Final short CREATED_BY justifications', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 086: applied ${out.length} CREATED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
