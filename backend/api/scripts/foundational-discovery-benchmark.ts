import { entities, relations } from '../prisma/foundational/catalog';

type Category = 'people' | 'works' | 'movements' | 'concepts' | 'places';
type Case = { category: Category; slug: string; expected: string[]; scope: 'western' | 'global' };
const c = (
  category: Category,
  slug: string,
  expected: string[],
  scope: Case['scope'] = 'western',
): Case => ({ category, slug, expected, scope });

// Curated expectations, not a degree target. One-hop paths through periods,
// generic places, Representation, or material nodes are intentionally ignored.
export const discoveryBenchmark: Case[] = [
  c('people', 'pablo-picasso', ['cubismo', 'guernica', 'las-senoritas-de-avignon', 'paul-cezanne']),
  c('people', 'leonardo-da-vinci', [
    'renacimiento-italiano',
    'mona-lisa',
    'ultima-cena',
    'florencia',
  ]),
  c('people', 'diego-velazquez', ['barroco', 'las-meninas', 'madrid', 'museo-del-prado']),
  c('people', 'francisco-de-goya', [
    'romanticismo',
    'tres-de-mayo-1808',
    'saturno-devorando-a-su-hijo',
    'madrid',
  ]),
  c('people', 'vincent-van-gogh', [
    'postimpresionismo',
    'noche-estrellada',
    'los-girasoles',
    'paris',
  ]),
  c('people', 'claude-monet', ['impresionismo', 'impresion-sol-naciente', 'paris']),
  c('people', 'marcel-duchamp', ['dadaismo', 'fuente', 'nueva-york']),
  c(
    'people',
    'frida-kahlo',
    ['muralismo-mexicano', 'las-dos-fridas', 'ciudad-de-mexico'],
    'global',
  ),
  c('people', 'andy-warhol', ['pop-art', 'diptico-marilyn', 'campbells-soup-cans', 'nueva-york']),
  c('people', 'rembrandt', ['barroco', 'ronda-de-noche', 'amsterdam']),
  c('people', 'miguel-angel', ['renacimiento-italiano', 'david-de-miguel-angel', 'florencia']),
  c('people', 'sandro-botticelli', [
    'renacimiento-italiano',
    'el-nacimiento-de-venus',
    'florencia',
  ]),
  c('people', 'caravaggio', ['barroco', 'vocacion-de-san-mateo', 'roma']),
  c('people', 'salvador-dali', ['surrealismo', 'la-persistencia-de-la-memoria', 'paris']),
  c('people', 'katsushika-hokusai', ['ukiyo-e', 'gran-ola-de-kanagawa', 'tokio'], 'global'),
  c('people', 'ai-weiwei', ['arte-conceptual', 'semillas-de-girasol', 'pekin'], 'global'),
  c('people', 'edvard-munch', ['expresionismo', 'simbolismo', 'el-grito']),
  c('people', 'gian-lorenzo-bernini', ['barroco', 'roma', 'extasis-de-santa-teresa']),
  c('people', 'alberto-giacometti', ['surrealismo', 'cuerpo', 'paris']),
  c('people', 'edward-hopper', ['realismo', 'nighthawks', 'nueva-york']),
  c('works', 'guernica', ['pablo-picasso', 'cubismo', 'guerra-civil-espanola', 'guerra']),
  c('works', 'las-meninas', ['diego-velazquez', 'barroco', 'museo-del-prado', 'retrato']),
  c('works', 'mona-lisa', ['leonardo-da-vinci', 'renacimiento-italiano', 'louvre', 'retrato']),
  c('works', 'el-nacimiento-de-venus', [
    'sandro-botticelli',
    'renacimiento-italiano',
    'uffizi',
    'belleza',
  ]),
  c('works', 'noche-estrellada', ['vincent-van-gogh', 'postimpresionismo', 'moma']),
  c('works', 'olympia', ['edouard-manet', 'realismo', 'retrato']),
  c('works', 'fuente', ['marcel-duchamp', 'dadaismo', 'metropolitan-museum', 'originalidad']),
  c('works', 'gran-ola-de-kanagawa', ['katsushika-hokusai', 'ukiyo-e', 'paisaje'], 'global'),
  c('works', 'david-de-miguel-angel', ['miguel-angel', 'renacimiento-italiano', 'cuerpo']),
  c('works', 'tres-de-mayo-1808', ['francisco-de-goya', 'romanticismo', 'guerra']),
  c('works', 'las-dos-fridas', ['frida-kahlo', 'muralismo-mexicano', 'identidad'], 'global'),
  c('works', 'la-persistencia-de-la-memoria', ['salvador-dali', 'surrealismo', 'tiempo']),
  c('works', 'casa-sobre-la-cascada', ['frank-lloyd-wright', 'arquitectura-moderna', 'hormigon']),
  c('works', 'edificio-bauhaus-dessau', ['walter-gropius', 'bauhaus-movement', 'dessau']),
  c('works', 'el-grito', ['edvard-munch', 'expresionismo', 'cuerpo']),
  c('works', 'nighthawks', ['edward-hopper', 'realismo', 'ciudad', 'instituto-de-arte-chicago']),
  c('works', 'campbells-soup-cans', ['andy-warhol', 'pop-art', 'consumo', 'moma']),
  c('works', 'la-traicion-de-las-imagenes', [
    'rene-magritte',
    'surrealismo',
    'representacion',
    'lenguaje',
  ]),
  c('works', 'bronces-de-benin', ['arte-africano', 'patrimonio', 'bronce'], 'global'),
  c(
    'works',
    'gran-mezquita-de-djenne',
    ['arte-africano', 'patrimonio', 'djenne-artists'],
    'global',
  ),
  c('movements', 'renacimiento', ['leonardo-da-vinci', 'miguel-angel', 'rafael', 'florencia']),
  c('movements', 'barroco', ['caravaggio', 'diego-velazquez', 'gian-lorenzo-bernini', 'roma']),
  c('movements', 'romanticismo', ['francisco-de-goya', 'eugene-delacroix', 'tres-de-mayo-1808']),
  c('movements', 'impresionismo', ['claude-monet', 'edgar-degas', 'impresion-sol-naciente']),
  c('movements', 'cubismo', ['pablo-picasso', 'georges-braque', 'guernica']),
  c('movements', 'surrealismo', [
    'salvador-dali',
    'rene-magritte',
    'la-persistencia-de-la-memoria',
  ]),
  c('movements', 'bauhaus-movement', ['walter-gropius', 'edificio-bauhaus-dessau', 'tecnologia']),
  c('movements', 'dadaismo', ['marcel-duchamp', 'fuente', 'primera-guerra-mundial']),
  c('movements', 'pop-art', ['andy-warhol', 'campbells-soup-cans', 'consumo']),
  c('movements', 'arte-conceptual', ['judy-chicago', 'the-dinner-party', 'autoria']),
  c('concepts', 'cuerpo', ['david-de-miguel-angel', 'doryphoros', 'el-grito']),
  c('concepts', 'guerra', ['guernica', 'tres-de-mayo-1808', 'segunda-guerra-mundial']),
  c('concepts', 'muerte', ['saturno-devorando-a-su-hijo', 'tres-de-mayo-1808']),
  c('concepts', 'memoria', ['guernica', 'la-persistencia-de-la-memoria']),
  c('concepts', 'retrato', ['mona-lisa', 'las-meninas', 'joven-de-la-perla']),
  c('concepts', 'religion', ['ultima-cena', 'vocacion-de-san-mateo', 'hagia-sophia']),
  c('concepts', 'naturaleza', ['impresion-sol-naciente', 'noche-estrellada', 'land-art']),
  c('concepts', 'ciudad', ['guernica', 'nighthawks', 'casa-sobre-la-cascada']),
  c('concepts', 'luz', ['vocacion-de-san-mateo', 'impresion-sol-naciente', 'joven-de-la-perla']),
  c('concepts', 'feminismo', ['the-dinner-party', 'semiotica-de-la-cocina', 'judy-chicago']),
  c('places', 'paris', ['pablo-picasso', 'claude-monet', 'louvre']),
  c('places', 'florencia', ['leonardo-da-vinci', 'miguel-angel', 'uffizi']),
  c('places', 'roma', ['caravaggio', 'gian-lorenzo-bernini', 'panteon-de-roma']),
  c('places', 'madrid', ['diego-velazquez', 'francisco-de-goya', 'museo-del-prado']),
  c('places', 'nueva-york', ['andy-warhol', 'moma', 'marcel-duchamp']),
];

if (discoveryBenchmark.length !== 65)
  throw new Error(`Expected 65 discovery cases, got ${discoveryBenchmark.length}`);

const invalidBridges = new Set([
  'representacion',
  'paris',
  'nueva-york',
  'londres',
  'roma',
  'madrid',
  'siglo-xix',
  'siglo-xx',
  'siglo-xxi',
  'antiguedad',
  'edad-media',
  'edad-moderna',
  'renacimiento',
  'pintura-al-oleo',
  'marmol',
  'bronce',
  'lienzo',
]);
const adjacent = new Map<string, Set<string>>();
for (const relation of relations) {
  for (const [from, to] of [
    [relation.from, relation.to],
    [relation.to, relation.from],
  ]) {
    if (!adjacent.has(from)) adjacent.set(from, new Set());
    adjacent.get(from)!.add(to);
  }
}
const direct = (from: string, to: string) => adjacent.get(from)?.has(to) ?? false;
const oneHop = (from: string, to: string) =>
  [...(adjacent.get(from) ?? [])].some((via) => !invalidBridges.has(via) && direct(via, to));

export function evaluateDiscoveryBenchmark() {
  const results = discoveryBenchmark.map((item) => {
    const directResolved = item.expected.filter((target) => direct(item.slug, target));
    const oneHopResolved = item.expected.filter(
      (target) => !direct(item.slug, target) && oneHop(item.slug, target),
    );
    return {
      ...item,
      direct: directResolved,
      oneHop: oneHopResolved,
      missing: item.expected.filter(
        (target) => !directResolved.includes(target) && !oneHopResolved.includes(target),
      ),
    };
  });
  const expected = results.reduce((sum, item) => sum + item.expected.length, 0);
  const directCount = results.reduce((sum, item) => sum + item.direct.length, 0);
  const oneHopCount = results.reduce((sum, item) => sum + item.oneHop.length, 0);
  const byCategory = Object.fromEntries(
    ['people', 'works', 'movements', 'concepts', 'places'].map((category) => {
      const rows = results.filter((item) => item.category === category);
      const total = rows.reduce((sum, item) => sum + item.expected.length, 0);
      const found = rows.reduce((sum, item) => sum + item.direct.length + item.oneHop.length, 0);
      return [
        category,
        {
          cases: rows.length,
          expected: total,
          direct: rows.reduce((sum, item) => sum + item.direct.length, 0),
          useful: found,
          coverage: Number(((found / total) * 100).toFixed(1)),
        },
      ];
    }),
  );
  return {
    cases: results.length,
    expected,
    direct: directCount,
    oneHop: oneHopCount,
    missing: results.flatMap((item) => item.missing.map((target) => `${item.slug} → ${target}`)),
    directCoverage: Number(((directCount / expected) * 100).toFixed(1)),
    usefulCoverage: Number((((directCount + oneHopCount) / expected) * 100).toFixed(1)),
    byCategory,
    results,
  };
}

if (require.main === module) console.log(JSON.stringify(evaluateDiscoveryBenchmark(), null, 2));
