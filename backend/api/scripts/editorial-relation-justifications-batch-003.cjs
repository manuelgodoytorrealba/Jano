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
  'cmsvvxmdk02lm85sjs00ddh9i',
  'cmsvvxmdq02lo85sjsn3395rq',
  'rel-marcel-duchamp-cubismo',
  'cmsvvxm8w02jp85sjuij0ubuz',
  'cmsvvxock03f385sj2r6glcs8',
  'cmsvvxms302rw85sjeoqd47mz',
  'cmsvvxkt201yd85sj4vk453fl',
  'cmsvvxnsa036h85sj9i5ptf72',
  'cmsvvxkq301x585sjco8zwl34',
  'cmsvvxkq801x785sj1tkcdbl8',
  'cmsvvxmbv02ky85sjzsci8jpw',
  'cmsvvxm8902jf85sj7n6s3eiz',
  'cmsvvxobw03et85sj2e004hvz',
  'cmsvvxobm03ep85sjo6uk6sc6',
  'cmsvvxkiz01u785sjjiigb6iq',
  'cmtaf2hpo002007qt5ytj7vxc',
  'cmsvvxoar03ed85sjvnz2z196',
  'cmsvvxoch03f285sjh3vku65s',
  'cmsvvxkqi01xb85sjydj46t5d',
  'cmsvvxmbz02l085sjrdhyqnom',
];

const ids = relationIds.map(q).join(',');
const rows =
  JSON.parse(
    db(`
SELECT json_agg(row_to_json(x) ORDER BY x."fromSlug", x."toSlug")
FROM (
  SELECT r.id AS "relationId", rt.key AS "relationType",
    a.slug AS "fromSlug", a.title AS "fromTitle", a.type AS "fromType",
    t.slug AS "toSlug", t.title AS "toTitle", t.type AS "toType",
    COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title)
      FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId"
      WHERE sr."entityId" IN (r."fromId", r."toId")), '[]'::json) AS sources
  FROM "Relation" r
  JOIN "RelationType" rt ON rt.id=r."relationTypeId"
  JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId"
  WHERE r.id IN (${ids}) AND r.status='PUBLISHED'
) x`),
  ) || [];

if (rows.length !== relationIds.length)
  throw new Error(`Expected ${relationIds.length} published relations, got ${rows.length}`);

const templates = {
  BELONGS_TO_MOVEMENT: {
    es: (a, t) =>
      `La relación sitúa a ${a} dentro de ${t}, el movimiento artístico con el que se vincula. El vínculo ayuda a leer su práctica en un marco histórico y formal compartido.`,
    en: (a, t) =>
      `The relation places ${a} within ${t}, the artistic movement with which it is associated. It helps read the artist’s practice within a shared historical and formal framework.`,
  },
  BELONGS_TO_PERIOD: {
    es: (a, t) =>
      `La relación sitúa ${a} dentro de ${t}, el periodo histórico al que se adscribe. El vínculo ayuda a ubicar su desarrollo en un momento cultural concreto.`,
    en: (a, t) =>
      `The relation places ${a} within ${t}, the historical period with which it is associated. It helps locate its development within a specific cultural moment.`,
  },
  ABOUT_CONCEPT: {
    es: (a, t) =>
      `La relación conecta ${a} con ${t}, un concepto que forma parte de su marco de lectura. El vínculo señala una asociación editorial sin convertirla por sí solo en una interpretación cerrada.`,
    en: (a, t) =>
      `The relation connects ${a} with ${t}, a concept that forms part of its interpretive framework. It signals an editorial association without making it, by itself, a fixed interpretation.`,
  },
  LOCATED_IN: {
    es: (a, t) =>
      `La relación sitúa ${a} en ${t}. El vínculo concreta el lugar asociado a su actividad o trayectoria pública.`,
    en: (a, t) =>
      `The relation places ${a} in ${t}. It identifies the place associated with its public activity or history.`,
  },
};

const out = rows.map((row) => {
  const template = templates[row.relationType];
  if (!template) throw new Error(`No approved template for ${row.relationType}`);
  const claims = [
    `relation:${row.relationType}`,
    `published-entities:${row.fromSlug},${row.toSlug}`,
  ];
  const sources = row.sources;
  return {
    ...row,
    locales: {
      es: template.es(row.fromTitle, row.toTitle),
      en: template.en(row.fromTitle, row.toTitle),
    },
    status: 'APPROVED',
    claimsUsed: claims,
    sourcesUsed: sources,
    reviewNote:
      'Batch 003: selección priorizada por relación publicada y cobertura documental; redacción conservadora basada en el vínculo canónico y títulos de entidades.',
  };
});

let sql = 'BEGIN;';
for (const row of out)
  for (const locale of ['es', 'en']) {
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(row.relationId + locale)}),${q(row.relationId)},${q(locale)},${q(row.locales[locale])},'APPROVED',${q(JSON.stringify(row.claimsUsed))}::jsonb,${q(JSON.stringify(row.sourcesUsed))}::jsonb,${q(row.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  }
sql += 'COMMIT;';
db(sql);

fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-003.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_003', selection: '20 published, grounded, previously unjustified relations', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 003: applied ${out.length} relations / ${out.length * 2} bilingual justifications transactionally.`,
);
