const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const db = (sql) => execFileSync('docker', ['exec', '-i', 'infra-db-1', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'jano', '-d', 'jano'], { input: sql, encoding: 'utf8' });
const batch = process.env.BATCH ?? '002';
const text = (entity, locale) => entity.translations?.find((x) => x.locale === locale)?.title ?? entity.title;

const rows = JSON.parse(db(`SELECT json_agg(q.row) FROM (SELECT json_build_object(
  'relationId', r.id, 'relationType', rt.key,
  'artwork', json_build_object('slug', a.slug, 'title', a.title, 'translations', (SELECT json_agg(json_build_object('locale', x.locale, 'title', x.title)) FROM "EntityTranslation" x WHERE x."entityId"=a.id)),
  'target', json_build_object('slug', t.slug, 'title', t.title, 'translations', (SELECT json_agg(json_build_object('locale', x.locale, 'title', x.title)) FROM "EntityTranslation" x WHERE x."entityId"=t.id))
) AS row FROM "Relation" r
JOIN "Entity" a ON a.id=r."fromId" JOIN "Entity" t ON t.id=r."toId" JOIN "RelationType" rt ON rt.id=r."relationTypeId"
WHERE a.type='ARTWORK' AND a.status='PUBLISHED' AND t.status='PUBLISHED' AND a.id<>t.id
AND NOT EXISTS (SELECT 1 FROM "EditorialRelationJustification" e WHERE e."relationId"=r.id)
ORDER BY a.slug,t.slug LIMIT 20) q`));

const templates = {
  CREATED_BY: {
    es: (a, t) => `La relación de autoría identifica a ${t} como responsable de ${a}. Fija quién realizó la obra y sitúa su lectura dentro de la práctica de ese artista.`,
    en: (a, t) => `The authorship relation identifies ${t} as the maker of ${a}. It establishes who created the work and places its reading within that artist’s practice.`,
  },
  BELONGS_TO_MOVEMENT: {
    es: (a, t) => `La relación sitúa ${a} dentro de ${t}, el movimiento artístico al que se adscribe. Ayuda a reconocer el marco histórico y formal en el que se comprende la obra.`,
    en: (a, t) => `The relation places ${a} within ${t}, the artistic movement to which it is associated. It helps identify the historical and formal context in which the work can be understood.`,
  },
  BELONGS_TO_PERIOD: {
    es: (a, t) => `La relación sitúa ${a} dentro de ${t}, el periodo histórico al que se adscribe. Ayuda a ubicar la obra en el momento cultural en que se comprende.`,
    en: (a, t) => `The relation places ${a} within ${t}, the historical period with which it is associated. It helps locate the work in the cultural moment in which it can be understood.`,
  },
  LOCATED_IN: {
    es: (a, t) => `La relación sitúa ${a} en ${t}. Este vínculo concreta dónde se encuentra la obra y qué institución o lugar forma parte de su historia pública.`,
    en: (a, t) => `The relation places ${a} in ${t}. It specifies where the work is located and which institution or place forms part of its public history.`,
  },
  ABOUT_CONCEPT: {
    es: (a, t) => `La relación vincula ${a} con ${t}, un concepto asociado a su lectura temática. Permite reconocer una de las ideas que orientan la interpretación de la obra.`,
    en: (a, t) => `The relation links ${a} with ${t}, a concept associated with its thematic reading. It identifies one of the ideas that guides interpretation of the work.`,
  },
  HAS_SUBJECT: {
    es: (a, t) => `La relación identifica ${t} como asunto o tema representado en ${a}. Ayuda a reconocer qué aparece en la obra sin añadir una interpretación no documentada.`,
    en: (a, t) => `The relation identifies ${t} as a subject or theme represented in ${a}. It clarifies what appears in the work without adding an undocumented interpretation.`,
  },
  ASSOCIATED_WITH: {
    es: (a, t) => `La relación asocia ${a} con ${t}. El vínculo señala una conexión publicada entre la obra y ese referente, sin afirmar por sí solo influencia o causalidad.`,
    en: (a, t) => `The relation associates ${a} with ${t}. It signals a published connection between the work and that reference without by itself asserting influence or causation.`,
  },
  USES_MATERIAL: {
    es: (a, t) => `La relación identifica ${t} como material de ${a}. El dato ayuda a comprender cómo la obra se concreta físicamente.`,
    en: (a, t) => `The relation identifies ${t} as a material used in ${a}. This detail helps explain how the work takes physical form.`,
  },
  USES_TECHNIQUE: {
    es: (a, t) => `La relación identifica ${t} como técnica de ${a}. El dato concreta el procedimiento con el que fue realizada la obra.`,
    en: (a, t) => `The relation identifies ${t} as a technique used in ${a}. It specifies the process through which the work was made.`,
  },
};

if (rows.length < 1 || rows.length > 20) throw new Error(`Expected 1-20 candidates, got ${rows.length}`);
const out = rows.map((r) => {
  const template = templates[r.relationType];
  if (!template) throw new Error(`No safe template for ${r.relationType}`);
  const es = template.es(text(r.artwork, 'es'), text(r.target, 'es'));
  const en = template.en(text(r.artwork, 'en'), text(r.target, 'en'));
  return {
    relationId: r.relationId, artworkSlug: r.artwork.slug, targetSlug: r.target.slug,
    relationType: r.relationType, localeTexts: { es, en }, status: 'APPROVED',
    claimsUsed: [`relation:${r.relationType}`, `published-entity:${r.target.slug}`],
    sourcesUsed: ['published canonical relation', 'published entity titles'],
    reviewNote: `Batch ${batch}: conservative bilingual justification generated from the published relation and entity titles.`,
  };
});

let sql = 'BEGIN;';
for (const r of out) for (const locale of ['es', 'en']) {
  sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(r.localeTexts[locale])},'APPROVED',${q(JSON.stringify(r.claimsUsed))}::jsonb,${q(JSON.stringify(r.sourcesUsed))}::jsonb,${q(r.reviewNote)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO NOTHING;`;
}
db(sql + 'COMMIT;');
fs.writeFileSync(`artifacts/editorial-recovery/editorial-relation-justifications-batch-${batch}.json`, JSON.stringify({ batch, rows: out }, null, 2));
console.log(`Batch ${batch}: applied ${out.length} bilingual editorial relation justifications.`);
