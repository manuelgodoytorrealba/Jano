import { ConflictException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface } from '@prisma/client';
import { HomeDecksService } from './home-decks.service';

describe('HomeDecksService', () => {
  let service: HomeDecksService;

  const prisma = {
    homeDeck: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    homeDeckItem: {
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    entity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const publishedEntity = {
    id: 'entity-published',
    slug: 'guernica',
    title: 'Guernica',
    type: 'ARTWORK',
    status: EntityStatus.PUBLISHED,
    mediaLinks: [],
  };

  const draftEntity = {
    id: 'entity-draft',
    slug: 'draft-work',
    title: 'Draft Work',
    type: 'ARTWORK',
    status: EntityStatus.DRAFT,
    mediaLinks: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new HomeDecksService(prisma as any);
  });

  it('loads public decks as active decks ordered by editorial sort and published items only', async () => {
    prisma.homeDeck.findMany.mockResolvedValue([
      buildDeck({
        slug: 'artwork',
        ctaRoute: '/entities/artwork',
        items: [
          {
            id: 'item-1',
            sortOrder: 0,
            entity: publishedEntity,
          },
        ],
      }),
    ]);
    prisma.entity.findMany.mockResolvedValue([]);

    const result = await service.listPublic();

    expect(prisma.homeDeck.findMany).toHaveBeenCalledWith({
      where: { isActive: true, surface: HomeDeckSurface.HOME },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: expect.objectContaining({
        items: expect.objectContaining({
          where: {
            entity: {
              status: EntityStatus.PUBLISHED,
            },
          },
        }),
      }),
    });
    expect(result).toHaveLength(2);
    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entity.resolvedMedia).toBeDefined();
    expect(result[1]).toEqual(
      expect.objectContaining({
        slug: 'place',
        ctaRoute: '/entities/place',
        isVirtual: true,
      }),
    );
  });

  it('does not append a virtual place deck when one already exists', async () => {
    prisma.homeDeck.findMany.mockResolvedValue([
      buildDeck({
        slug: 'place',
        ctaRoute: '/entities/place',
        items: [],
      }),
    ]);
    prisma.entity.findMany.mockResolvedValue([]);

    const result = await service.listPublic();

    expect(prisma.entity.findMany).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].isVirtual).toBe(false);
  });

  it('returns admin warnings for inactive, incomplete, and unpublished deck content', async () => {
    prisma.homeDeck.findMany.mockResolvedValue([
      buildDeck({
        isActive: false,
        imageUrl: null,
        ctaLabel: null,
        ctaRoute: null,
        items: [
          {
            id: 'item-1',
            sortOrder: 0,
            entity: draftEntity,
          },
        ],
      }),
    ]);

    const result = await service.adminList();

    expect(result[0].warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'inactive' }),
        expect.objectContaining({ code: 'missing_image' }),
        expect.objectContaining({ code: 'no_published_entities' }),
        expect.objectContaining({ code: 'unpublished_entity' }),
      ]),
    );
  });

  it('adds a deck entity with the next persisted sort order', async () => {
    prisma.homeDeck.findUnique
      .mockResolvedValueOnce({ id: 'deck-1' })
      .mockResolvedValueOnce(buildDeck());
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-1' });
    prisma.homeDeckItem.findFirst.mockResolvedValue(null);
    prisma.homeDeckItem.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
    prisma.homeDeckItem.create.mockResolvedValue({ id: 'item-1' });

    await service.addEntity('deck-1', { entityId: 'entity-1' });

    expect(prisma.homeDeckItem.create).toHaveBeenCalledWith({
      data: {
        deckId: 'deck-1',
        entityId: 'entity-1',
        sortOrder: 5,
      },
    });
  });

  it('rejects duplicate deck entities', async () => {
    prisma.homeDeck.findUnique.mockResolvedValue({ id: 'deck-1' });
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-1' });
    prisma.homeDeckItem.findFirst.mockResolvedValue({ id: 'existing-item' });

    await expect(service.addEntity('deck-1', { entityId: 'entity-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('materializes the virtual place deck as an active persisted deck with seeded entities', async () => {
    prisma.homeDeck.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ sortOrder: 5 });
    prisma.entity.findMany.mockResolvedValue([
      { id: 'place-1', slug: 'museo-del-prado' },
      { id: 'place-2', slug: 'museo-reina-sofia' },
      { id: 'place-3', slug: 'moma' },
      { id: 'place-4', slug: 'guggenheim-bilbao' },
    ]);
    prisma.homeDeck.create.mockResolvedValue(buildDeck({
      id: 'deck-place',
      slug: 'place',
      title: 'Lugares',
      ctaRoute: '/entities/place',
      sortOrder: 6,
      items: [
        { id: 'item-1', sortOrder: 0, entity: publishedEntity },
      ],
      translations: [
        { locale: 'es', title: 'Lugares', subtitle: 'Contexto institucional', description: 'Museos, colecciones y espacios que anclan obras, movimientos y memoria pública.', ctaLabel: 'Explorar lugares' },
        { locale: 'en', title: 'Places', subtitle: 'Institutional context', description: 'Museums, collections and spaces that anchor works, movements and public memory.', ctaLabel: 'Explore places' },
      ],
    }));

    const result = await service.materializeVirtualDeck('place');

    expect(prisma.homeDeck.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        slug: 'place',
        isActive: true,
        ctaRoute: '/entities/place',
        sortOrder: 6,
        items: {
          create: [
            { entityId: 'place-1', sortOrder: 0 },
            { entityId: 'place-2', sortOrder: 1 },
            { entityId: 'place-3', sortOrder: 2 },
            { entityId: 'place-4', sortOrder: 3 },
          ],
        },
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      slug: 'place',
      isActive: true,
      ctaRoute: '/entities/place',
    }));
  });
});

function buildDeck(overrides: Record<string, any> = {}) {
  return {
    id: 'deck-1',
    slug: 'discover',
    title: 'Discover',
    subtitle: 'Visual paths',
    description: 'A curated deck.',
    ctaLabel: 'Explore',
    ctaUrl: null,
    ctaRoute: '/entities/artwork',
    imageUrl: '/assets/home/artwork.jpg',
    imageMediaId: null,
    imageMedia: null,
    surface: HomeDeckSurface.HOME,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
    updatedAt: new Date('2026-04-29T00:00:00.000Z'),
    items: [],
    ...overrides,
  };
}
