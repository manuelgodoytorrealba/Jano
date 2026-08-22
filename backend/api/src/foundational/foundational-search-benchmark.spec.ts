import { entities } from '../../prisma/foundational/catalog';
import { benchmark } from '../../scripts/foundational-search-benchmark';

describe('Foundational MVP search benchmark', () => {
  it('keeps the 300-query corpus balanced and stable', () => {
    expect(benchmark).toHaveLength(300);
    expect(benchmark.filter((item) => item.category === 'people')).toHaveLength(100);
    expect(benchmark.filter((item) => item.category === 'works')).toHaveLength(74);
  });

  it('keeps essential canonical entities in the seed', () => {
    const slugs = new Set(entities.map((entity) => entity.slug));
    expect(
      [
        'leonardo-da-vinci',
        'miguel-angel',
        'rafael',
        'sandro-botticelli',
        'caravaggio',
        'rembrandt',
        'johannes-vermeer',
        'diego-velazquez',
        'francisco-de-goya',
        'vincent-van-gogh',
        'claude-monet',
        'edgar-degas',
        'paul-cezanne',
        'henri-matisse',
        'pablo-picasso',
        'marcel-duchamp',
        'salvador-dali',
        'frida-kahlo',
        'diego-rivera',
        'andy-warhol',
        'ai-weiwei',
        'mona-lisa',
        'el-nacimiento-de-venus',
        'las-meninas',
        'guernica',
        'david-de-miguel-angel',
        'fuente',
        'gran-ola-de-kanagawa',
        'renacimiento',
        'barroco',
        'neoclasicismo',
        'romanticismo',
        'impresionismo',
        'postimpresionismo',
        'dadaismo',
        'bauhaus-movement',
        'surrealismo',
        'minimalismo',
        'arte-conceptual',
        'retrato',
        'autorretrato',
        'paisaje',
        'cuerpo',
        'muerte',
        'guerra',
        'religion',
        'pintura-al-oleo',
        'fresco',
        'fotografia',
        'grabado',
        'marmol',
        'bronce',
        'paris',
        'florencia',
        'roma',
        'madrid',
        'nueva-york',
        'museo-del-prado',
        'louvre',
        'moma',
        'edvard-munch',
        'el-grito',
        'gian-lorenzo-bernini',
        'extasis-de-santa-teresa',
        'alberto-giacometti',
        'edward-hopper',
        'nighthawks',
        'campbells-soup-cans',
        'la-traicion-de-las-imagenes',
      ].every((slug) => slugs.has(slug)),
    ).toBe(true);
  });
});
