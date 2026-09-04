import { EntityIdentityResolver } from './entity-identity-resolver';

describe('EntityIdentityResolver', () => {
  const resolver = new EntityIdentityResolver();
  const catalog = [
    {
      id: 'picasso',
      title: 'Pablo Picasso',
      type: 'ARTIST',
      aliases: ['P. Picasso'],
      externalIds: { viaf: '123' },
      meaningful: true,
      independentlyIdentifiable: true,
    },
  ];

  it('resolves accents, aliases and stable identifiers without fuzzy matching', () => {
    expect(
      resolver.resolve(
        {
          title: 'Pablo Picasso',
          type: 'ARTIST',
          meaningful: true,
          independentlyIdentifiable: true,
        },
        catalog,
      ).disposition,
    ).toBe('EXISTING_ENTITY');
    expect(
      resolver.resolve(
        { title: 'P. Picasso', type: 'ARTIST', meaningful: true, independentlyIdentifiable: true },
        catalog,
      ).disposition,
    ).toBe('ALIAS_OR_DUPLICATE');
  });

  it('routes new, possible and incidental mentions safely', () => {
    expect(
      resolver.resolve(
        {
          title: 'Artista documentada',
          type: 'ARTIST',
          sourceContext: 'Catálogo razonado, p. 7',
          meaningful: true,
          independentlyIdentifiable: true,
        },
        catalog,
      ).disposition,
    ).toBe('NEW_ENTITY_HIGH_CONFIDENCE');
    expect(
      resolver.resolve(
        { title: 'Grupo incierto', meaningful: true, independentlyIdentifiable: true },
        catalog,
      ).disposition,
    ).toBe('POSSIBLE_ENTITY');
    expect(
      resolver.resolve(
        { title: 'Visita guiada', meaningful: false, independentlyIdentifiable: false },
        catalog,
      ).disposition,
    ).toBe('MENTION_ONLY');
  });
});
