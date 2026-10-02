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
const selections = [
  [
    'cmsvvxoa503e485sjqrk3d7y2',
    'A museum education resource identifies conceptual art as harking back to Dadaist attempts to question what art is and how it functions.',
    'https://noma.org/wp-content/uploads/2015/08/NOMA_-_Conceptual_Art_Educator_Resource-1411765546.pdf',
  ],
  [
    'cmsvvxoa003e285sj6xp1n87r',
    'The Guggenheim Museum Bilbao describes Pop Art as having its roots in Dada.',
    'https://www.guggenheim-bilbao.eus/en/exhibitions/pop-art',
  ],
  [
    'cmsvvxo9p03dx85sjsx71ooup',
    'The Thyssen-Bornemisza Museum records Malevich’s move from Cubism and Futurism toward Suprematism in the formulation of his new artistic theory.',
    'https://www.museothyssen.org/en/collection/artists/malevich-kazimir',
  ],
];
const ids = selections.map(([id]) => q(id)).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Citation" c JOIN "Source" s ON s.id=c."sourceId" WHERE c."relationId"=r.id),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== selections.length)
  throw new Error(`Expected ${selections.length} published relations, got ${rows.length}`);
const evidence = new Map(selections.map(([id, claim, source]) => [id, { claim, source }]));
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const item = evidence.get(r.relationId);
  const locales = {
    es: `La relación se apoya en una afirmación causal específica: ${r.fromTitle} recibió una influencia documentada de ${r.toTitle}. ${item.claim}`,
    en: `The relation is supported by a specific causal claim: ${r.fromTitle} received a documented influence from ${r.toTitle}. ${item.claim}`,
  };
  const claims = ['relation:INFLUENCED_BY', `causal-claim:${item.claim}`, `source:${item.source}`];
  const note = `Batch 029: approved after documentary review. Specific evidence: ${item.claim} Source: ${item.source}`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, evidence: item, locales, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-029.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_029', selection: '3 INFLUENCED_BY relations with specific documentary support', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 029: applied ${out.length} INFLUENCED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
