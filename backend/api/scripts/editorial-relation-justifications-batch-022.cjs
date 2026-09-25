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
  'cmsvvxnqh035q85sjt3smtsu6',
  'cmsvvxnrg036485sjgza47p9l',
  'cmsvvxnqf035p85sj206kflt4',
  'cmsvvxnpj035985sjahanauzv',
  'cmsvvxnqo035t85sjjhlp830w',
  'cmsvvxnr6036085sjv45vpgfc',
  'cmsvvxnr1035y85sjygxdpon9',
  'cmsvvxnpb035585sjnsj8b9vp',
  'cmsvvxnqj035r85sj5w4f0aj6',
  'cmsvvxnpd035685sjyh7h5bjl',
  'cmtaf2hqr002n07qtejz34kp6',
  'cmtaf2hqs002o07qtrwao5znc',
  'cmtaf2hqp002m07qtra65i46f',
  'cmsvvxnqw035w85sj9dsdqcr1',
  'cmsvvxnqr035u85sj6fjttdth',
  'cmsvvxnph035885sj37sjzcoe',
  'cmsvvxnqb035n85sjfau7gska',
  'cmsvvxnr9036185sjg0eh2f4f',
  'cmsvvxnrb036285sjqxvci7he',
  'cmsvvxnpz035h85sjw507cs4f',
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
  'Batch 022: continuación del bloque ASSOCIATED_WITH; conexión publicada documentada mediante fuentes, sin afirmar influencia, causalidad o equivalencia conceptual.';
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
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-022.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_022', selection: '20 published ASSOCIATED_WITH relations prioritized by source coverage', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 022: applied ${out.length} ASSOCIATED_WITH relations / ${out.length * 2} bilingual justifications transactionally.`,
);
