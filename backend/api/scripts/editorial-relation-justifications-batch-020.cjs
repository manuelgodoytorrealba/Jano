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
  'cmsvvxmr702rj85sj9b96h0tb',
  'cmsvvxm4w02i085sjfwmgtn62',
  'cmsvvxns7036g85sjhc0c9llz',
  'cmtaf2hoz001m07qtm49hhvx3',
  'cmsvvxns4036f85sjwdt621ns',
  'cmsvvxmqr02rd85sjhhnwuaqv',
  'cmsvvxmqy02rg85sjny5gz9ss',
  'cmsvvxmr102rh85sjju06350m',
  'cmsvvxnrz036c85sjagyrf80e',
  'cmsvvxmql02rb85sjxv8h7d70',
  'cmsvvxns0036d85sjww197g9g',
  'cmsvvxns2036e85sjgv75uyf8',
  'cmsvvxnse036j85sjs58b088y',
  'cmsvvxmqo02rc85sjh6z6njsx',
  'cmsvvxmqw02rf85sj6udpf5k1',
  'cmsvvxmr402ri85sjahgbt9ty',
  'cmsvvxmqt02re85sj5zzs0iba',
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
    `Expected ${relationIds.length} published location relations, got ${rows.length}`,
  );
const note =
  'Batch 020: bloque LOCATED_IN; localización basada en relación publicada y fuentes registradas, sin añadir contexto institucional no documentado.';
const out = rows.map((r) => ({
  ...r,
  locales: {
    es: `La relación sitúa ${r.fromTitle} en ${r.toTitle}. El vínculo concreta el lugar asociado a su actividad o trayectoria pública.`,
    en: `The relation places ${r.fromTitle} in ${r.toTitle}. It identifies the place associated with its public activity or history.`,
  },
  claimsUsed: ['relation:LOCATED_IN', `published-entities:${r.fromSlug},${r.toSlug}`],
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-020.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_020', selection: '17 published LOCATED_IN relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 020: applied ${out.length} LOCATED_IN relations / ${out.length * 2} bilingual justifications transactionally.`,
);
