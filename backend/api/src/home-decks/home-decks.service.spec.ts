import { ConflictException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface } from '@prisma/client';
import { HomeDecksService } from './home-decks.service';

describe('HomeDecksService', () => {
  let service: HomeDecksService;

  const prisma = {
    homeDeck: {
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
        items: [
          {
            id: 'item-1',
            sortOrder: 0,
            entity: publishedEntity,
          },
        ],
      }),
    ]);

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
    expect(result).toHaveLength(1);
    expect(result[0].entities).toHaveLength(1);
    expect(result[0].entities[0].entity.resolvedMedia).toBeDefined();
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
