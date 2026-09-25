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
const relationIds = [
  'cmsypcok6001n07p5e06e2ci5',
  'cmqsecdvo001a35nyzwt00bth',
  'cmqsel7b7001l35ny77rly4l4',
  'cmqsei6no001g35nydy4manbx',
  'cmt4903oo000e07s3ryp4158f',
  'cmt0hn98l003i07p5sqxhrf5w',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."relationType",x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId",rt.key AS "relationType",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId" IN (r."fromId",r."toId")),'[]'::json) AS sources FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published relations, got ${rows.length}`);
const note =
  'Batch 024: cierre de relaciones seguras de baja cardinalidad; redacción basada en el tipo canónico y fuentes registradas, sin ampliar el alcance semántico.';
const templates = {
  HAS_SUBJECT: {
    es: (a, t) =>
      `La relación identifica ${t} como asunto o tema representado en ${a}. El vínculo aclara qué aparece en la obra sin añadir una interpretación no documentada.`,
    en: (a, t) =>
      `The relation identifies ${t} as a subject or theme represented in ${a}. It clarifies what appears in the work without adding an undocumented interpretation.`,
  },
  PART_OF: {
    es: (a, t) =>
      `La relación sitúa ${a} como parte de ${t}. El vínculo aclara su pertenencia dentro de esa estructura temporal.`,
    en: (a, t) =>
      `The relation places ${a} as part of ${t}. It clarifies its membership within that temporal structure.`,
  },
  RELATED_TO: {
    es: (a, t) =>
      `La relación conecta ${a} con ${t}. El vínculo recoge una relación publicada sin afirmar por sí solo influencia, causalidad o equivalencia.`,
    en: (a, t) =>
      `The relation connects ${a} with ${t}. It records a published relationship without by itself asserting influence, causation, or equivalence.`,
  },
};
const out = rows.map((r) => {
  const t = templates[r.relationType];
  return {
    ...r,
    locales: { es: t.es(r.fromTitle, r.toTitle), en: t.en(r.fromTitle, r.toTitle) },
    claimsUsed: [`relation:${r.relationType}`, `published-entities:${r.fromSlug},${r.toSlug}`],
    sourcesUsed: r.sources,
    reviewNote: note,
  };
});
let sql = 'BEGIN;';
for (const r of out)
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(r.locales[locale])},'APPROVED',${q(JSON.stringify(r.claimsUsed))}::jsonb,${q(JSON.stringify(r.sourcesUsed))}::jsonb,${q(r.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-024.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_024', selection: '6 published low-cardinality safe relations', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 024: applied ${out.length} safe relations / ${out.length * 2} bilingual justifications transactionally.`,
);
