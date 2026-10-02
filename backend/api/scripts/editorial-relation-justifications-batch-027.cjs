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
    'cmsvvxo9y03e185sj9e67a4ks',
    'The Museum of Modern Art identifies Surrealist ideas and techniques as an influence on American artists who developed Abstract Expressionism.',
    'https://www.moma.org/collection/terms/abstract-expressionism/a-new-art-for-a-new-world',
  ],
  [
    'cmsvvxo8y03dm85sj9yjuvg8l',
    'The National Gallery of Art describes Italian Renaissance artists as using Ancient Greece and Rome as models for their practice.',
    'https://www.nga.gov/artworks/italian-renaissance',
  ],
  [
    'cmsvvxo9003dn85sj91xd0yje',
    'The National Gallery of Art describes Italian Renaissance artists as using Ancient Greece and Rome as models for their practice.',
    'https://www.nga.gov/artworks/italian-renaissance',
  ],
  [
    'cmsvvxo9303do85sjmsw3a0nn',
    'The Victoria and Albert Museum states that Neoclassicism drew inspiration from the art and culture of Ancient Greece and Rome.',
    'https://www.vam.ac.uk/collections/neoclassicism',
  ],
  [
    'cmsvvxo9503dp85sjkdgzycn7',
    'The Victoria and Albert Museum states that Neoclassicism drew inspiration from the art and culture of Ancient Greece and Rome.',
    'https://www.vam.ac.uk/collections/neoclassicism',
  ],
  [
    'cmsvvxmrs02rr85sj2k82hvpj',
    'Museo Reina Sofía documents that Picasso confirmed being influenced by Paul Cézanne in his understanding of painting during 1906.',
    'https://www.museoreinasofia.es/sites/default/files/picasso_1906_en.pdf',
  ],
  [
    'cmsvvxo9f03dt85sjrf2fpxnl',
    'The National Gallery of Art describes Post-Impressionists as taking Impressionist recordings of light and colour in nature into more emotional and spiritual directions.',
    'https://www.nga.gov/artworks/impressionism',
  ],
  [
    'cmsvvxo9h03du85sjm98jeflc',
    'The Metropolitan Museum of Art describes Cézanne, a Post-Impressionist, as influencing Cubists and Fauves.',
    'https://www.metmuseum.org/pt/essays/paul-cezanne-1839-1906',
  ],
  [
    'cmsvvxo9k03dv85sjnihqrn5w',
    'The Metropolitan Museum of Art identifies Cézanne as a Post-Impressionist whose method influenced Cubist art.',
    'https://www.metmuseum.org/pt/essays/paul-cezanne-1839-1906',
  ],
  [
    'cmsvvxo9w03e085sjghemwso2',
    'The National Gallery of Art states that Surrealism built on Dada and its use of chance and absurdity.',
    'https://www.nga.gov/surrealism',
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
const byId = new Map(selections.map(([id, claim, source]) => [id, { claim, source }]));
const locales = (r, claim) => ({
  es: `La relación se apoya en una afirmación causal específica: ${r.fromTitle} recibió o desarrolló una influencia documentada de ${r.toTitle}. ${claim}`,
  en: `The relation is supported by a specific causal claim: ${r.fromTitle} received or developed a documented influence from ${r.toTitle}. ${claim}`,
});
let sql = 'BEGIN;';
const out = rows.map((r) => {
  const evidence = byId.get(r.relationId);
  const text = locales(r, evidence.claim);
  const claims = [
    `relation:INFLUENCED_BY`,
    `causal-claim:${evidence.claim}`,
    `source:${evidence.source}`,
  ];
  const note = `Batch 027: approved after documentary review. Specific evidence: ${evidence.claim} Source: ${evidence.source}`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote","createdAt","updatedAt") VALUES (md5(${q(r.relationId + locale)}),${q(r.relationId)},${q(locale)},${q(text[locale])},'APPROVED',${q(JSON.stringify(claims))}::jsonb,${q(JSON.stringify(r.sources))}::jsonb,${q(note)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"='APPROVED',"claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote","updatedAt"=CURRENT_TIMESTAMP;`;
  return { ...r, evidence, locales: text, claims, sources: r.sources };
});
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/editorial-relation-justifications-batch-027.json',
  `${JSON.stringify({ batch: 'EDITORIAL_RELATION_JUSTIFICATIONS_027', selection: '10 INFLUENCED_BY relations with specific documentary support', rows: out }, null, 2)}\n`,
);
console.log(
  `Batch 027: applied ${out.length} INFLUENCED_BY relations / ${out.length * 2} bilingual justifications transactionally.`,
);
