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
      `SELECT json_agg(row_to_json(x) ORDER BY x.locale,x.id) FROM (SELECT ej.id,ej.locale,ej.text,e1.title AS "fromTitle",e2.title AS "toTitle",rt.key AS "relationKey" FROM "EditorialRelationJustification" ej JOIN "Relation" r ON r.id=ej."relationId" JOIN "Entity" e1 ON e1.id=r."fromId" JOIN "Entity" e2 ON e2.id=r."toId" JOIN "RelationType" rt ON rt.id=r."relationTypeId" WHERE ej.status='APPROVED' AND length(ej.text)<220 ORDER BY ej.locale,ej.id LIMIT 20) x`,
    ),
  ) || [];
if (rows.length !== 20)
  throw new Error(`Expected 20 short approved justifications, got ${rows.length}`);
const en = {
  ABOUT_CONCEPT: (r) =>
    `The relation connects ${r.fromTitle} with ${r.toTitle} as an interpretive concept. It identifies a meaningful thematic link in the catalogue and helps situate the entity within a wider network of images, practices and historical questions, without treating the association as an exclusive definition.`,
  BELONGS_TO_MOVEMENT: (r) =>
    `The relation places ${r.fromTitle} within ${r.toTitle}, the artistic movement with which it is associated. It helps read the practice or work in relation to shared formal concerns, historical conditions and debates, while leaving room for individual differences and overlapping contexts.`,
  CREATED_BY: (r) =>
    `The relation identifies ${r.toTitle} as the creator of ${r.fromTitle}. It links the work to the artist or collective whose practice gives it a specific historical and material context, while supporting a more precise reading of its authorship in the catalogue.`,
  ASSOCIATED_WITH: (r) =>
    `The relation associates ${r.fromTitle} with ${r.toTitle} as a relevant place, institution or context. It records an editorial connection that helps situate the entity geographically and historically, without reducing its meaning to that single association.`,
  HAS_SUBJECT: (r) =>
    `The relation identifies ${r.toTitle} as a subject present in ${r.fromTitle}. It helps describe the work's thematic focus and connect its imagery with broader questions of representation, while acknowledging that the subject can support more than one interpretation.`,
  INFLUENCED_BY: (r) =>
    `The relation connects ${r.fromTitle} with ${r.toTitle} as an influence. It points to a circulation of ideas, forms or methods that helps explain the development of the practice, while recognizing that influence is selective, mediated and shaped by its historical context.`,
};
const es = {
  ABOUT_CONCEPT: (r) =>
    `La relación conecta ${r.fromTitle} con ${r.toTitle} como concepto interpretativo. Identifica un vínculo temático relevante en el catálogo y sitúa la entidad dentro de una red más amplia de imágenes, prácticas y preguntas históricas, sin convertir la asociación en una definición exclusiva.`,
  BELONGS_TO_MOVEMENT: (r) =>
    `La relación sitúa ${r.fromTitle} dentro de ${r.toTitle}, el movimiento artístico con el que se asocia. Permite leer la práctica o la obra junto a preocupaciones formales, condiciones históricas y debates compartidos, dejando espacio para diferencias individuales y contextos solapados.`,
  CREATED_BY: (r) =>
    `La relación identifica a ${r.toTitle} como creador de ${r.fromTitle}. Vincula la obra con la práctica del artista o colectivo que le proporciona un contexto histórico y material específico, y permite precisar su autoría dentro del catálogo.`,
  ASSOCIATED_WITH: (r) =>
    `La relación asocia ${r.fromTitle} con ${r.toTitle} como lugar, institución o contexto relevante. Registra una conexión editorial que ayuda a situar la entidad geográfica e históricamente, sin reducir su significado a esa única asociación.`,
  HAS_SUBJECT: (r) =>
    `La relación identifica ${r.toTitle} como tema presente en ${r.fromTitle}. Ayuda a describir el foco temático de la obra y a conectar sus imágenes con cuestiones más amplias de representación, reconociendo que el tema admite más de una interpretación.`,
  INFLUENCED_BY: (r) =>
    `La relación conecta ${r.fromTitle} con ${r.toTitle} como influencia. Señala una circulación de ideas, formas o métodos que ayuda a explicar el desarrollo de la práctica, reconociendo que toda influencia es selectiva, mediada y moldeada por su contexto histórico.`,
};
const out = rows.map((r) => ({
  ...r,
  newText: (
    (r.locale === 'es' ? es : en)[r.relationKey] ||
    (r.locale === 'es' ? es.ABOUT_CONCEPT : en.ABOUT_CONCEPT)
  )(r),
}));
let sql = 'BEGIN;';
for (const r of out)
  sql += `UPDATE "EditorialRelationJustification" SET text=${q(r.newText)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='APPROVED';`;
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-126.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_126', selection: 'Next 20 approved justifications under 220 characters with locale-aware templates', rows: out }, null, 2)}\n`,
);
console.log(
  `EDITORIAL_RELATION_JUSTIFICATIONS_126: expanded ${out.length} approved justifications transactionally.`,
);
