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
    'cmsvvxoa203e385sjfo30q5xe',
    'The Museum of Modern Art identifies Constructivism among the aesthetic foundations of Ad Reinhardt and describes his restrained compositions as a progenitor of Minimalism.',
    'https://www.moma.org/artists/4856-ad-reinhardt',
  ],
  [
    'cmsvvxo9a03dr85sjor85gya9',
    'The Metropolitan Museum explains that Courbet’s realism was steeped in the Romantic emphasis on self-exploration, linking the emergence of Realism to Romantic artistic concerns.',
    'https://www.metmuseum.org/exhibitions/listings/2008/gustave-courbet',
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
  const note = `Batch 034: approved after documentary review. Specific evidence: ${item.claim} Source: ${item.source}`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locales[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, evidence: item, locales, claims, sources: r.sources };
});

db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-034.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_034', selection: '2 INFLUENCED_BY relations with specific documentary support', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 034: applied ${out.length} INFLUENCED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
