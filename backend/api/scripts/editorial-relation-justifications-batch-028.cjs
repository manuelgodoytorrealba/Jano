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
    'cmsvvxoaa03e685sj6tdch12v',
    'The Victoria and Albert Museum describes Arts and Crafts as a key predecessor of Art Nouveau and states that Art Nouveau was indebted to the movement.',
    'https://www.vam.ac.uk/articles/art-nouveau-an-international-style',
  ],
  [
    'cmsvvxoa803e585sjb6a7bre1',
    'The Metropolitan Museum of Art states that Bauhaus artists absorbed ideas from Russian Constructivism in their photographic and design practice.',
    'https://www.metmuseum.org/exhibitions/listings/2001/photography-and-the-bauhaus',
  ],
  [
    'cmsvvxoai03e985sj1lw6e014',
    'The Ota Memorial Museum of Art documents the influence of Chinese culture in ukiyo-e, including Chinese subjects, literature and visual traditions.',
    'https://www.ukiyoe-ota-muse.jp/china-in-ukiyo-e-eng/',
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
  const note = `Batch 028: approved after documentary review. Specific evidence: ${item.claim} Source: ${item.source}`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, evidence: item, locales, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-028.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_028', selection: '3 INFLUENCED_BY relations with specific documentary support', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 028: applied ${out.length} INFLUENCED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
