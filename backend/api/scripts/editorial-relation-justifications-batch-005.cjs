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
const relationIds = [
  'cmtfznllm000y1jo07p5h6ajt',
  'cmsvvxm6c02il85sjrxbht1eo',
  'cmsvvxmru02rs85sju4mqvx45',
  'cmtaf2hpn001z07qtn4i0raa2',
  'cmtfo7zyc01td01pbc503mo7i',
  'cmtfo7zya01tc01pb12djtoqx',
  'cmtfo7zxw01tb01pbvl2e7l0j',
  'cmtfo81ad01tw01pbleadkrof',
  'cmtaf2hp6001q07qt8eu4yrwf',
  'cmtfo81ab01tv01pbuu1xd5ki',
  'cmtfo81ag01tx01pbg0ao716e',
  'cmtfo81a901tu01pbtws9dk68',
  'cmtfo81ar01ty01pbhrz0xvvm',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(`
SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug", x."toSlug")
FROM (
  SELECT r.id AS "relationId", rt.key AS "relationType",
    a.slug AS "fromSlug", a.title AS "fromTitle", t.slug AS "toSlug", t.title AS "toTitle",
    COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title)
      FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId"
      WHERE sr."entityId" IN (r."fromId", r."toId")), '[]'::json) AS sources
  FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId"
  JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId"
  WHERE r.id IN (${ids}) AND r.status='PUBLISHED'
) x`),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published artist relations, got ${rows.length}`);

const templates = {
  CREATED_BY: {
    es: (a, t) =>
      `La relación de autoría identifica a ${t} como responsable de ${a}. El vínculo establece quién realizó la obra y la conecta con la práctica de ese artista.`,
    en: (a, t) =>
      `The authorship relation identifies ${t} as the maker of ${a}. It establishes who created the work and connects it with that artist’s practice.`,
  },
  ABOUT_CONCEPT: {
    es: (a, t) =>
      `La relación conecta a ${a} con ${t}, un concepto que forma parte de su marco de lectura. El vínculo señala una asociación editorial sin convertirla por sí solo en una interpretación cerrada.`,
    en: (a, t) =>
      `The relation connects ${a} with ${t}, a concept that forms part of its interpretive framework. It signals an editorial association without making it, by itself, a fixed interpretation.`,
  },
  ASSOCIATED_WITH: {
    es: (a, t) =>
      `La relación asocia a ${a} con ${t}. El vínculo recoge una conexión publicada entre ambos referentes sin afirmar por sí solo influencia, causalidad o identidad conceptual.`,
    en: (a, t) =>
      `The relation associates ${a} with ${t}. It records a published connection between the two references without by itself asserting influence, causation, or conceptual identity.`,
  },
};
const note =
  'Batch 005: relaciones restantes que involucran artistas; selección basada en relación publicada y cobertura documental, con redacción conservadora y no causal.';
const out = rows.map((row) => {
  const template = templates[row.relationType];
  if (!template) throw new Error(`No template for ${row.relationType}`);
  return {
    ...row,
    locales: {
      es: template.es(row.fromTitle, row.toTitle),
      en: template.en(row.fromTitle, row.toTitle),
    },
    status: 'APPROVED',
    claimsUsed: [
      `relation:${row.relationType}`,
      `published-entities:${row.fromSlug},${row.toSlug}`,
    ],
    sourcesUsed: row.sources,
    reviewNote: note,
  };
});

let sql = 'BEGIN;';
for (const row of out)
  for (const locale of ['es', 'en']) {
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(row.relationId + locale)}),${q(row.relationId)},${q(locale)},${q(row.locales[locale])},'APPROVED',${q(JSON.stringify(row.claimsUsed))}::jsonb,${q(JSON.stringify(row.sourcesUsed))}::jsonb,${q(row.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  }
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-005.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_005', selection: '13 published artist-related relations prioritized by type and source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 005: applied ${out.length} artist-related relations / ${out.length * 2} bilingual justifications transactionally.`,
);
