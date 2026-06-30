import { CuratedService } from './curated.service';
import type { PrismaService } from '../prisma/prisma.service';

type CuratedEntityFixture = {
  id: string;
  slug: string;
  title: string;
  type: string;
} & Record<string, unknown>;

type CuratedDeckFixture = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageMedia: null;
  translations: [];
  items: Array<{
    id: string;
    entityId: string;
    sortOrder: number;
    entity: CuratedEntityFixture;
  }>;
};

type CuratedRelationFixture = {
  id: string;
  fromId: string;
  toId: string;
  weight: number;
  relationType: { key: string; directed: boolean };
  from: CuratedEntityFixture;
  to: CuratedEntityFixture;
};

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
    service = new CuratedService(prisma as unknown as PrismaService);
  });

  it('returns an empty response when no published curations are available', async () => {
    prisma.homeDeck.findMany.mockResolvedValue([]);

    await expect(service.page()).resolves.toBeNull();
    expect(prisma.entity.findFirst).not.toHaveBeenCalled();
  });

  it('builds the page around the requested selected entity and limits staff picks to three', async () => {
    const memoria = buildEntity({
      id: 'concept-1',
      slug: 'memoria',
      title: 'Memoria',
      type: 'CONCEPT',
    });
    const guerra = buildEntity({
      id: 'concept-2',
      slug: 'guerra',
      title: 'Guerra',
      type: 'CONCEPT',
    });
    const guernica = buildEntity({
      id: 'artwork-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
    });
    const picasso = buildEntity({
      id: 'artist-1',
      slug: 'pablo-picasso',
      title: 'Pablo Picasso',
      type: 'ARTIST',
    });

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
      .mockResolvedValueOnce([buildRelation('r3', guernica, picasso, 'CREATED_BY', 1)])
      .mockResolvedValueOnce([
        {
          id: 'r4',
          fromId: memoria.id,
          toId: guerra.id,
          weight: 1,
          relationType: { directed: false, key: 'RELATED_TO' },
        },
      ]);
    prisma.entity.findMany.mockResolvedValue([guernica, picasso]);

    const result = await service.page('memoria', 'es');

    if (!result) throw new Error('Expected curated page');

    expect(result.selectedEntity.slug).toBe('memoria');
    expect(result.staffPicks).toHaveLength(3);
    expect(result.staffPicks.map((item) => item.slug)).toEqual([
      'memoria-y-trauma',
      'arte-y-guerra',
      'muerte-y-memoria',
    ]);
    expect(result.relatedEntities.some((item) => item.slug === 'guerra')).toBe(true);
    expect(result.tabGroups.artworks.some((item) => item.slug === 'guernica')).toBe(true);
    expect(result.graph.centerId).toBe(memoria.id);
    expect(result.graph.nodes.some((item) => item.slug === 'guerra')).toBe(true);
    expect(result.graph.edges.some((item) => item.relationType === 'RELATED_TO')).toBe(true);
  });
});

function buildEntity(overrides: Partial<CuratedEntityFixture> = {}): CuratedEntityFixture {
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

function buildDeck(slug: string, entities: CuratedEntityFixture[]): CuratedDeckFixture {
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

function buildRelation(
  id: string,
  from: CuratedEntityFixture,
  to: CuratedEntityFixture,
  type: string,
  weight: number,
): CuratedRelationFixture {
  return {
    id,
    fromId: from.id,
    toId: to.id,
    relationType: { key: type, directed: type !== 'RELATED_TO' },
    weight,
    from,
    to,
  };
}
