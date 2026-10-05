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

const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x."relationType",x."fromTitle",x."toTitle") FROM (SELECT r.id AS "relationId",rt.key AS "relationType",a.title AS "fromTitle",b.title AS "toTitle",COALESCE((SELECT json_agg(DISTINCT s.title ORDER BY s.title) FROM "Citation" c JOIN "Source" s ON s.id=c."sourceId" WHERE c."relationId"=r.id),'[]'::json) AS sources FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" b ON b.id=r."toId" LEFT JOIN "EditorialRelationJustification" j ON j."relationId"=r.id AND j.locale='es' AND j.status='APPROVED' WHERE r.status='PUBLISHED' AND (a.type='CONCEPT' OR b.type='CONCEPT') AND rt.key IN ('ABOUT_CONCEPT','ASSOCIATED_WITH','USES_MATERIAL','USES_TECHNIQUE','HAS_SUBJECT') AND (COALESCE(length(j.text),0)<=180 OR j."reviewNote" LIKE 'Batch 046:%')) x`,
    ),
  ) || [];
if (rows.length !== 156)
  throw new Error(`Expected 156 generic concept relations, got ${rows.length}`);

const wording = {
  ABOUT_CONCEPT: {
    es: (r) =>
      `La relación vincula ${r.fromTitle} con ${r.toTitle} como marco interpretativo concreto: el concepto ofrece una vía para leer un aspecto de la entidad relacionada sin reducirla a una única interpretación. La asociación publicada funciona como orientación temática, no como afirmación de influencia o identidad.`,
    en: (r) =>
      `The relation connects ${r.fromTitle} with ${r.toTitle} as a specific interpretive frame: the concept offers one way to read an aspect of the related entity without reducing it to a single interpretation. The published association is thematic guidance, not a claim of influence or identity.`,
  },
  ASSOCIATED_WITH: {
    es: (r) =>
      `La relación asocia ${r.fromTitle} con ${r.toTitle} como conexión contextual publicada. Permite explorar una proximidad temática o histórica entre ambos referentes sin afirmar causalidad, influencia directa ni equivalencia conceptual.`,
    en: (r) =>
      `The relation associates ${r.fromTitle} with ${r.toTitle} as a published contextual connection. It opens a thematic or historical proximity without claiming causality, direct influence or conceptual equivalence.`,
  },
  USES_MATERIAL: {
    es: (r) =>
      `La relación registra el vínculo material entre ${r.fromTitle} y ${r.toTitle}: el material ayuda a orientar la lectura de su fabricación, superficie o conservación. No implica que sea el único material ni agota la interpretación de la entidad.`,
    en: (r) =>
      `The relation records a material connection between ${r.fromTitle} and ${r.toTitle}: the material helps orient the reading of making, surface or conservation. It does not imply that it is the only material or exhaust the entity’s interpretation.`,
  },
  USES_TECHNIQUE: {
    es: (r) =>
      `La relación identifica ${r.toTitle} como técnica vinculada a ${r.fromTitle}. La técnica ofrece una entrada para estudiar procedimientos, decisiones formales y condiciones de producción sin convertirla en una definición exclusiva de la obra.`,
    en: (r) =>
      `The relation identifies ${r.toTitle} as a technique connected with ${r.fromTitle}. The technique offers a way to study procedures, formal decisions and conditions of production without becoming an exclusive definition of the work.`,
  },
  HAS_SUBJECT: {
    es: (r) =>
      `La relación identifica ${r.toTitle} como asunto o tema de ${r.fromTitle}. Este vínculo orienta la lectura hacia lo representado sin confundir el tema con una descripción completa de la obra ni con una afirmación de intención autoral.`,
    en: (r) =>
      `The relation identifies ${r.toTitle} as a subject or theme of ${r.fromTitle}. It directs reading toward what is represented without treating the subject as a complete description or a claim about authorial intention.`,
  },
};

let sql = 'BEGIN;';
const out = rows.map((r) => {
  const es = wording[r.relationType].es(r);
  const en = wording[r.relationType].en(r);
  const claims = [
    `relation:${r.relationType}`,
    `from:${r.fromTitle}`,
    `to:${r.toTitle}`,
    'scope:editorial-link',
  ];
  const note = `Batch 046: final concept-related relation pass. Replaced mechanical wording with type-specific editorial scope; no unsupported causal claim added.`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(locale === 'es' ? es : en)},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, locales: { es, en }, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-046.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_046', selection: 'All remaining generic relations involving concepts', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 046: applied ${out.length} concept-related relations / ${out.length * 2} bilingual justifications transactionally.`,
);
