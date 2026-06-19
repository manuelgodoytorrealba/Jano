import { CuratedService } from './curated.service';

describe('CuratedService', () => {
  let service: CuratedService;

  const prisma = {
    homeDeck: {
      findMany: jest.fn(),
    },
    entity: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    relation: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CuratedService(prisma as any);
  });

  it('builds the page around the requested selected entity and limits staff picks to three', async () => {
    const memoria = buildEntity({ id: 'concept-1', slug: 'memoria', title: 'Memoria', type: 'CONCEPT' });
    const guerra = buildEntity({ id: 'concept-2', slug: 'guerra', title: 'Guerra', type: 'CONCEPT' });
    const guernica = buildEntity({ id: 'artwork-1', slug: 'guernica', title: 'Guernica', type: 'ARTWORK' });
    const picasso = buildEntity({ id: 'artist-1', slug: 'pablo-picasso', title: 'Pablo Picasso', type: 'ARTIST' });

    prisma.homeDeck.findMany.mockResolvedValue([
      buildDeck('memoria-y-trauma', [memoria, guerra, guernica]),
      buildDeck('arte-y-guerra', [memoria, guerra, guernica]),
      buildDeck('muerte-y-memoria', [memoria]),
      buildDeck('extra-deck', [memoria, picasso]),
    ]);

    prisma.entity.findFirst.mockResolvedValueOnce(memoria);
    prisma.relation.findMany
      .mockResolvedValueOnce([
        buildRelation('r1', memoria, guerra, 'RELATED_TO', 1),
        buildRelation('r2', guernica, memoria, 'ABOUT_CONCEPT', 0.9),
      ])
      .mockResolvedValueOnce([
        buildRelation('r3', guernica, picasso, 'CREATED_BY', 1),
      ])
      .mockResolvedValueOnce([
        { fromId: memoria.id, toId: guerra.id, relationType: { directed: false, key: 'RELATED_TO' } },
      ]);
    prisma.entity.findMany.mockResolvedValue([guernica, picasso]);

    const result = await service.page('memoria', 'es');

    expect(result.selectedEntity.slug).toBe('memoria');
    expect(result.staffPicks).toHaveLength(3);
    expect(result.staffPicks.map((item: any) => item.slug)).toEqual([
      'memoria-y-trauma',
      'arte-y-guerra',
      'muerte-y-memoria',
    ]);
    expect(result.relatedEntities.some((item: any) => item.slug === 'guerra')).toBe(true);
    expect(result.tabGroups.artworks.some((item: any) => item.slug === 'guernica')).toBe(true);
  });
});

function buildEntity(overrides: Record<string, any> = {}) {
  return {
    id: 'entity-1',
    slug: 'entity-1',
    title: 'Entity',
    type: 'CONCEPT',
    summary: 'Summary',
    content: 'Content',
    status: 'PUBLISHED',
    startYear: null,
    endYear: null,
    translations: [],
    mediaLinks: [],
    artwork: null,
    artist: null,
    concept: { definition: 'Definition', translations: [] },
    period: null,
    ...overrides,
  };
}

function buildDeck(slug: string, entities: any[]) {
  return {
    id: slug,
    slug,
    title: slug,
    subtitle: 'Curated',
    description: 'Deck',
    imageUrl: '/assets/home/concept.jpg',
    imageMedia: null,
    translations: [],
    items: entities.map((entity, index) => ({
      id: `${slug}-${entity.id}`,
      entityId: entity.id,
      sortOrder: index,
      entity,
    })),
  };
}

function buildRelation(id: string, from: any, to: any, type: string, weight: number) {
  return {
    id,
    fromId: from.id,
    toId: to.id,
    type,
    weight,
    from,
    to,
  };
}
