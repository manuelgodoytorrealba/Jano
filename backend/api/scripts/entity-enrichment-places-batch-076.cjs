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
const copy = {
  pekin: [
    'Pekín reúne tradiciones imperiales, pintura, caligrafía, arquitectura y transformaciones modernas fundamentales para la historia cultural de China.',
    'Beijing brings together imperial traditions, painting, calligraphy, architecture and modern transformations central to China’s cultural history.',
  ],
  praga: [
    'Praga es un contexto de arquitectura, diseño, literatura y vanguardias donde convergen tradiciones centroeuropeas y transformaciones modernas.',
    'Prague is a context of architecture, design, literature and avant-gardes where Central European traditions and modern transformations converge.',
  ],
  roma: [
    'Roma articula antigüedad, cristianismo, coleccionismo, arquitectura y poder institucional en una historia decisiva para la cultura visual europea.',
    'Rome brings together antiquity, Christianity, collecting, architecture and institutional power in a history decisive for European visual culture.',
  ],
  'sao-paulo': [
    'São Paulo es un centro brasileño de modernismo, diseño, arquitectura y arte contemporáneo, atravesado por diversidad urbana y desigualdad social.',
    'São Paulo is a Brazilian centre of modernism, design, architecture and contemporary art, shaped by urban diversity and social inequality.',
  ],
  seul: [
    'Seúl reúne patrimonio, tecnología, diseño, cultura popular y arte contemporáneo en una historia marcada por modernización y globalización.',
    'Seoul brings together heritage, technology, design, popular culture and contemporary art in a history marked by modernisation and globalisation.',
  ],
  teheran: [
    'Teherán ofrece un contexto de arte moderno y contemporáneo, arquitectura, cine y debates sobre identidad, religión y transformación social en Irán.',
    'Tehran offers a context of modern and contemporary art, architecture, cinema and debates about identity, religion and social transformation in Iran.',
  ],
  tenochtitlan: [
    'Tenochtitlan fue la capital mexica, cuyo urbanismo, arquitectura, ritual y memoria permiten estudiar la complejidad de las culturas del México prehispánico.',
    'Tenochtitlan was the Mexica capital, whose urbanism, architecture, ritual and memory reveal the complexity of pre-Hispanic cultures in Mexico.',
  ],
  teotihuacan: [
    'Teotihuacan fue una gran ciudad mesoamericana cuya arquitectura, pintura mural y organización ceremonial siguen siendo claves para estudiar el mundo antiguo.',
    'Teotihuacan was a major Mesoamerican city whose architecture, mural painting and ceremonial organisation remain key to studying the ancient world.',
  ],
  tokio: [
    'Tokio es un centro de diseño, fotografía, arquitectura, cultura popular y arte contemporáneo marcado por densidad urbana y cambios tecnológicos.',
    'Tokyo is a centre of design, photography, architecture, popular culture and contemporary art shaped by urban density and technological change.',
  ],
  toledo: [
    'Toledo permite estudiar la convivencia y transformación de tradiciones cristianas, judías e islámicas en arquitectura, manuscritos y artes decorativas.',
    'Toledo allows the study of the coexistence and transformation of Christian, Jewish and Islamic traditions in architecture, manuscripts and decorative arts.',
  ],
  venecia: [
    'Venecia reúne comercio, arquitectura, pintura, vidrio, coleccionismo y bienales en una relación singular entre ciudad, agua y cultura visual.',
    'Venice brings together trade, architecture, painting, glass, collecting and biennials in a distinctive relation between city, water and visual culture.',
  ],
  viena: [
    'Viena fue un centro de academias, música, arquitectura y modernidad artística donde se cruzaron tradición imperial, diseño y vanguardias.',
    'Vienna was a centre of academies, music, architecture and artistic modernity where imperial tradition, design and avant-gardes intersected.',
  ],
  weimar: [
    'Weimar es un lugar asociado a la Bauhaus, la pedagogía artística, el diseño y los debates sobre la integración entre arte, artesanía e industria.',
    'Weimar is associated with the Bauhaus, art pedagogy, design and debates about integrating art, craft and industry.',
  ],
  zurich: [
    'Zúrich fue un escenario importante para dadaísmo, exilio, imprenta y redes internacionales de experimentación artística durante la modernidad.',
    'Zurich was an important setting for Dada, exile, printing and international networks of artistic experimentation during modernity.',
  ],
};
const slugs = Object.keys(copy);
const rows =
  JSON.parse(
    db(
      `SELECT json_agg(row_to_json(x) ORDER BY x.slug) FROM (SELECT e.id,e.slug,e.title,COALESCE((SELECT json_agg(DISTINCT t.title ORDER BY t.title) FROM "Relation" r JOIN "Entity" t ON t.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED'),'[]'::json) AS related FROM "Entity" e WHERE e.slug IN (${slugs.map(q).join(',')}) AND e.type='PLACE' AND e.status='PUBLISHED') x`,
    ),
  ) || [];
if (rows.length !== slugs.length)
  throw new Error(`Expected ${slugs.length} published places, got ${rows.length}`);
const essays = (r, es, en) => ({
  es: `## Contexto\n\n${es}\n\n## Relaciones de lectura\n\n${r.related.length ? `En el catálogo se relaciona con ${r.related.slice(0, 8).join(', ')}. Estas conexiones permiten estudiar el lugar a través de obras, artistas, movimientos y periodos concretos.` : 'La entrada funciona como un punto de partida para investigar sus capas históricas, culturales y territoriales.'}\n\n## Cómo continuar\n\nConviene distinguir entre el lugar histórico, sus representaciones y las instituciones que hoy organizan su memoria cultural.`,
  en: `## Context\n\n${en}\n\n## Reading relationships\n\n${r.related.length ? `The catalogue connects it with ${r.related.slice(0, 8).join(', ')}. These paths allow the place to be studied through concrete works, artists, movements and periods.` : 'This entry is a starting point for investigating its historical, cultural and territorial layers.'}\n\n## How to continue\n\nDistinguish between the historical place, its representations and the institutions that organise its cultural memory today.`,
});
const out = rows.map((r) => {
  const [es, en] = copy[r.slug];
  return {
    ...r,
    summary_es: es,
    summary_en: en,
    ...Object.fromEntries(
      Object.entries(essays(r, es, en)).map(([locale, essay]) => [`essay_${locale}`, essay]),
    ),
  };
});
let sql = 'BEGIN;';
for (const r of out) {
  sql += `UPDATE "Entity" SET summary=${q(r.summary_es)},content=${q(r.essay_es)},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${q(r.id)} AND status='PUBLISHED';`;
  for (const locale of ['es', 'en'])
    sql += `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","excerpt","createdAt","updatedAt") VALUES (md5(${q(r.id + locale)}),${q(r.id)},${q(locale)},${q(r.title)},${q(r['summary_' + locale])},${q(r['essay_' + locale])},${q(r['summary_' + locale])},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("entityId","locale") DO UPDATE SET "shortDescription"=EXCLUDED."shortDescription","essay"=EXCLUDED."essay","excerpt"=EXCLUDED."excerpt","updatedAt"=CURRENT_TIMESTAMP;`;
}
db(sql + 'COMMIT;');
fs.mkdirSync('artifacts/editorial-recovery', { recursive: true });
fs.writeFileSync(
  'artifacts/editorial-recovery/entity-enrichment-places-batch-076.json',
  `${JSON.stringify({ batch: 'ENTITY_ENRICHMENT_PLACES_076', selection: 'Final 14 published places missing base editorial fields', rows: out }, null, 2)}\n`,
);
console.log(
  `ENTITY_ENRICHMENT_PLACES_076: updated ${out.length} places with bilingual base editorial fields transactionally.`,
);
