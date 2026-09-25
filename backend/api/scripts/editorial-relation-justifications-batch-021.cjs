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
  'cmsvvxm7002iv85sj0hrk8x1m',
  'cmsvvxm7302ix85sjnyzzbopu',
  'cmsvvxnq5035k85sjpl7j4f5d',
  'cmsvvxnqt035v85sj7akmqe4l',
  'cmsvvxnp9035485sjckj6t9xf',
  'cmsvvxnpf035785sjmfxg97mc',
  'cmsvvxnpt035e85sjgokq3jrk',
  'cmsvvxnq3035j85sjlgoc4g18',
  'cmsvvxnqy035x85sjpqo4uaeg',
  'cmsvvxnrd036385sj29z8mb75',
  'cmsvvxnqm035s85sj938d6rc5',
  'cmsvvxnpl035a85sjxn85i5j9',
  'cmtaf2hrp003407qt3fw08ccj',
  'cmsvvxnpn035b85sjegf5zv39',
  'cmsvvxms102rv85sj7trs8id3',
  'cmsvvxnq7035l85sj0m1opsdc',
  'cmsvvxnq1035i85sjfyoyjrce',
  'cmsvvxmry02ru85sj49xu78zl',
  'cmsvvxnpr035d85sjlk4e7nby',
  'cmsvvxnpv035f85sj5h482dzb',
];
const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug",x."toSlug") FROM (SELECT r.id AS "relationId",a.slug AS "fromSlug",a.title AS "fromTitle",t.slug AS "toSlug",t.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId" IN (r."fromId",r."toId")),'[]'::json) AS sources FROM "Relation" r JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" WHERE r.id IN (${ids}) AND r.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== relationIds.length)
  throw new Error(
    `Expected ${relationIds.length} published associated relations, got ${rows.length}`,
  );
const note =
  'Batch 021: bloque ASSOCIATED_WITH; conexión publicada documentada mediante fuentes, sin afirmar influencia, causalidad o equivalencia conceptual.';
const out = rows.map((r) => ({
  ...r,
  locales: {
    es: `La relación asocia ${r.fromTitle} con ${r.toTitle}. El vínculo recoge una conexión publicada entre ambos referentes sin afirmar por sí solo influencia, causalidad o identidad conceptual.`,
    en: `The relation associates ${r.fromTitle} with ${r.toTitle}. It records a published connection between the two references without by itself asserting influence, causation, or conceptual identity.`,
  },
  claimsUsed: ['relation:ASSOCIATED_WITH', `published-entities:${r.fromSlug},${r.toSlug}`],
  sourcesUsed: r.sources,
  reviewNote: note,
}));
let sql = 'BEGIN;';
for (const r of out)
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(r.locales[locale])},'APPROVED',${q(JSON.stringify(r.claimsUsed))}::jsonb,${q(JSON.stringify(r.sourcesUsed))}::jsonb,${q(r.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-021.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_021', selection: '20 published ASSOCIATED_WITH relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 021: applied ${out.length} ASSOCIATED_WITH relations / ${out.length * 2} bilingual justifications transactionally.`,
);
