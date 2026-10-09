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
      `SELECT json_agg(row_to_json(x) ORDER BY x."relationType",x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId", rt.key AS "relationType", a.title AS "fromTitle", a.type AS "fromType", b.title AS "toTitle", b.type AS "toType" FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND (a.type='MOVEMENT' OR b.type='MOVEMENT') AND rt.key IN ('ASSOCIATED_WITH','RELATED_TO') AND length(j.text)<=180) x`,
    ),
  ) || [];
if (rows.length !== 2) throw new Error(`Expected 2 short movement relations, got ${rows.length}`);

const wording = (r) =>
  r.relationType === 'ASSOCIATED_WITH'
    ? {
        es: `La relación asocia ${r.fromTitle} con ${r.toTitle} como una conexión histórica y contextual publicada. Permite investigar los espacios de circulación, encuentro o recepción que acercan ambos referentes, sin afirmar por sí sola influencia directa, causalidad, identidad estilística ni equivalencia conceptual.`,
        en: `The relation associates ${r.fromTitle} with ${r.toTitle} as a published historical and contextual connection. It supports research into the spaces of circulation, encounter or reception that bring both references together, without claiming direct influence, causality, stylistic identity or conceptual equivalence.`,
      }
    : {
        es: `La relación conecta ${r.fromTitle} con ${r.toTitle} porque ambos referentes comparten un campo de investigación vinculado al graffiti, el espacio público y sus dimensiones educativas y sociales. El vínculo abre una vía de lectura contextual, sin afirmar que sean equivalentes ni que exista una relación causal única entre ellos.`,
        en: `The relation connects ${r.fromTitle} with ${r.toTitle} because both references share a field of inquiry connected to graffiti, public space and its educational and social dimensions. The link opens a contextual reading without claiming equivalence or a single causal relation between them.`,
      };
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const text = wording(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:contextual-link',
    'claim:no-exclusive-causality',
  ];
  const note =
    'Batch 059: final movement-relation pass; replaced short generic wording with specific contextual scope and no unsupported causal claim.';
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,'[]'::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: text, claims, sources: [] };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-059.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_059', selection: 'Final short relations involving movements', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 059: applied ${out.length} movement relations / ${out.length * 2} bilingual justifications transactionally.`,
);
