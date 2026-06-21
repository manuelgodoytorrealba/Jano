import { Test, TestingModule } from '@nestjs/testing';
import { EntitiesService } from './entities.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EntitiesService.list filters', () => {
  let service: EntitiesService;

  const prisma = {
    $transaction: jest.fn(),
    entity: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    source: {
      deleteMany: jest.fn(),
    },
    sourceRef: {
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    entityMedia: {
      deleteMany: jest.fn(),
    },
    contributor: {
      deleteMany: jest.fn(),
    },
    curatorNote: {
      deleteMany: jest.fn(),
    },
    entityTag: {
      deleteMany: jest.fn(),
    },
    entityAlias: {
      deleteMany: jest.fn(),
    },
    homeDeckItem: {
      deleteMany: jest.fn(),
    },
    collectionEntity: {
      deleteMany: jest.fn(),
    },
    savedEntity: {
      deleteMany: jest.fn(),
    },
    artworkDetails: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    artistDetails: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    conceptDetails: {
      deleteMany: jest.fn(),
    },
    periodDetails: {
      deleteMany: jest.fn(),
    },
    relation: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma.entity.count.mockReset();
    prisma.entity.findFirst.mockReset();
    prisma.entity.findMany.mockReset();
    prisma.entity.findUnique.mockReset();
    prisma.entity.delete.mockReset();
    prisma.$transaction.mockReset();
    prisma.source.deleteMany.mockReset();
    prisma.sourceRef.findMany.mockReset();
    prisma.sourceRef.count.mockReset();
    prisma.sourceRef.deleteMany.mockReset();
    prisma.entityMedia.deleteMany.mockReset();
    prisma.contributor.deleteMany.mockReset();
    prisma.curatorNote.deleteMany.mockReset();
    prisma.entityTag.deleteMany.mockReset();
    prisma.entityAlias.deleteMany.mockReset();
    prisma.homeDeckItem.deleteMany.mockReset();
    prisma.collectionEntity.deleteMany.mockReset();
    prisma.savedEntity.deleteMany.mockReset();
    prisma.artistDetails.findMany.mockReset();
    prisma.artistDetails.deleteMany.mockReset();
    prisma.artworkDetails.findMany.mockReset();
    prisma.artworkDetails.deleteMany.mockReset();
    prisma.conceptDetails.deleteMany.mockReset();
    prisma.periodDetails.deleteMany.mockReset();
    prisma.relation.findMany.mockReset();
    prisma.relation.deleteMany.mockReset();
    prisma.entity.count.mockResolvedValue(0);
    prisma.entity.findFirst.mockResolvedValue(null);
    prisma.entity.findMany.mockResolvedValue([]);
    prisma.entity.findUnique.mockResolvedValue(null);
    prisma.entity.delete.mockResolvedValue({ id: 'entity-id' });
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.source.deleteMany.mockResolvedValue({ count: 0 });
    prisma.sourceRef.findMany.mockResolvedValue([]);
    prisma.sourceRef.count.mockResolvedValue(0);
    prisma.sourceRef.deleteMany.mockResolvedValue({ count: 0 });
    prisma.entityMedia.deleteMany.mockResolvedValue({ count: 0 });
    prisma.contributor.deleteMany.mockResolvedValue({ count: 0 });
    prisma.curatorNote.deleteMany.mockResolvedValue({ count: 0 });
    prisma.entityTag.deleteMany.mockResolvedValue({ count: 0 });
    prisma.entityAlias.deleteMany.mockResolvedValue({ count: 0 });
    prisma.homeDeckItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.collectionEntity.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedEntity.deleteMany.mockResolvedValue({ count: 0 });
    prisma.artistDetails.findMany.mockResolvedValue([]);
    prisma.artistDetails.deleteMany.mockResolvedValue({ count: 0 });
    prisma.artworkDetails.findMany.mockResolvedValue([]);
    prisma.artworkDetails.deleteMany.mockResolvedValue({ count: 0 });
    prisma.conceptDetails.deleteMany.mockResolvedValue({ count: 0 });
    prisma.periodDetails.deleteMany.mockResolvedValue({ count: 0 });
    prisma.relation.findMany.mockResolvedValue([]);
    prisma.relation.deleteMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EntitiesService);
  });

  it('applies movement and period relation filters together with type, status and contentLevel', async () => {
    await service.list({
      type: 'ARTWORK',
      movement: 'surrealismo',
      period: 'siglo-xx',
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTWORK',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'surrealismo',
                },
              },
            },
          },
          {
            outgoing: {
              some: {
                type: 'BELONGS_TO_PERIOD',
                to: {
                  type: 'PERIOD',
                  slug: 'siglo-xx',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('combines text search with relation filters inside AND so filters remain composable', async () => {
    await service.list({
      q: 'memoria',
      movement: 'surrealismo',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        status: 'PUBLISHED',
        AND: [
          {
            OR: [
              { title: { contains: 'memoria', mode: 'insensitive' } },
              { summary: { contains: 'memoria', mode: 'insensitive' } },
              { content: { contains: 'memoria', mode: 'insensitive' } },
              { slug: { contains: 'memoria', mode: 'insensitive' } },
            ],
          },
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'surrealismo',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('lets admin search match article drafts by slug as well as visible text fields', async () => {
    await service.adminList({
      q: 'article-draft-preview',
      type: 'ARTICLE',
      status: 'DRAFT',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTICLE',
        status: 'DRAFT',
        AND: [
          {
            OR: [
              { title: { contains: 'article-draft-preview', mode: 'insensitive' } },
              { summary: { contains: 'article-draft-preview', mode: 'insensitive' } },
              { content: { contains: 'article-draft-preview', mode: 'insensitive' } },
              { slug: { contains: 'article-draft-preview', mode: 'insensitive' } },
            ],
          },
        ],
      },
    });
  });

  it('deletes dependent records before removing an entity in admin', async () => {
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-1' });
    prisma.sourceRef.findMany.mockResolvedValue([
      { sourceId: 'source-1' },
      { sourceId: 'source-2' },
      { sourceId: 'source-1' },
    ]);

    await expect(service.adminDelete('entity-1')).resolves.toEqual({ ok: true });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.relation.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromId: 'entity-1' },
          { toId: 'entity-1' },
        ],
      },
    });
    expect(prisma.entityMedia.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.sourceRef.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.contributor.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.curatorNote.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.entityTag.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.homeDeckItem.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.collectionEntity.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.savedEntity.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.artworkDetails.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.artistDetails.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.conceptDetails.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.periodDetails.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.entity.delete).toHaveBeenCalledWith({ where: { id: 'entity-1' } });
    expect(prisma.source.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['source-1', 'source-2'] },
        refs: {
          none: {},
        },
      },
    });
  });

  it('keeps admin list unrestricted by default so drafts remain visible in admin workflows', async () => {
    await service.adminList({
      type: 'ARTWORK',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTWORK',
      },
    });
  });

  it('passes the filtered where clause through to findMany for the paged list query', async () => {
    await service.list({
      type: 'ARTWORK',
      period: 'siglo-xx',
      status: 'PUBLISHED',
      page: 2,
      limit: 10,
      sort: 'recent',
    });

    expect(prisma.entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: {
          type: 'ARTWORK',
          status: 'PUBLISHED',
          AND: [
            {
              outgoing: {
                some: {
                  type: 'BELONGS_TO_PERIOD',
                  to: {
                    type: 'PERIOD',
                    slug: 'siglo-xx',
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it('filters artworks by institution using artwork.location', async () => {
    await service.list({
      type: 'ARTWORK',
      institution: 'Museo del Prado, Madrid',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTWORK',
        status: 'PUBLISHED',
        AND: [
          {
            artwork: {
              is: {
                location: {
                  equals: 'Museo del Prado, Madrid',
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('combines institution with movement and period inside the same AND clause', async () => {
    await service.list({
      type: 'ARTWORK',
      movement: 'surrealismo',
      period: 'siglo-xx',
      institution: 'Museo Reina Sofía, Madrid',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTWORK',
        status: 'PUBLISHED',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'surrealismo',
                },
              },
            },
          },
          {
            outgoing: {
              some: {
                type: 'BELONGS_TO_PERIOD',
                to: {
                  type: 'PERIOD',
                  slug: 'siglo-xx',
                },
              },
            },
          },
          {
            artwork: {
              is: {
                location: {
                  equals: 'Museo Reina Sofía, Madrid',
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('combines institution with text search and title sort for artwork catalogs', async () => {
    await service.list({
      type: 'ARTWORK',
      q: 'maman',
      institution: 'Guggenheim Bilbao',
      page: 1,
      limit: 24,
      sort: 'title',
    });

    expect(prisma.entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'asc' },
        where: {
          type: 'ARTWORK',
          status: 'PUBLISHED',
          AND: [
            {
              OR: [
                { title: { contains: 'maman', mode: 'insensitive' } },
                { summary: { contains: 'maman', mode: 'insensitive' } },
                { content: { contains: 'maman', mode: 'insensitive' } },
                { slug: { contains: 'maman', mode: 'insensitive' } },
              ],
            },
            {
              artwork: {
                is: {
                  location: {
                    equals: 'Guggenheim Bilbao',
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it('ignores institution when the requested catalog type is not artwork', async () => {
    await service.list({
      type: 'ARTIST',
      institution: 'Museo del Prado, Madrid',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
      },
    });
  });

  it('filters artists by nationality using artist.country', async () => {
    await service.list({
      type: 'ARTIST',
      nationality: 'España',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
        AND: [
          {
            artist: {
              is: {
                country: {
                  equals: 'España',
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('combines nationality with movement, period, q and title sort for artist catalogs', async () => {
    await service.list({
      type: 'ARTIST',
      nationality: 'Francia / Estados Unidos',
      movement: 'arte-contemporaneo',
      period: 'siglo-xx',
      q: 'louise',
      page: 1,
      limit: 24,
      sort: 'title',
    });

    expect(prisma.entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'asc' },
        where: {
          type: 'ARTIST',
          status: 'PUBLISHED',
          AND: [
            {
              OR: [
                { title: { contains: 'louise', mode: 'insensitive' } },
                { summary: { contains: 'louise', mode: 'insensitive' } },
                { content: { contains: 'louise', mode: 'insensitive' } },
                { slug: { contains: 'louise', mode: 'insensitive' } },
              ],
            },
            {
              outgoing: {
                some: {
                  type: {
                    in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                  },
                  to: {
                    type: 'MOVEMENT',
                    slug: 'arte-contemporaneo',
                  },
                },
              },
            },
            {
              outgoing: {
                some: {
                  type: 'BELONGS_TO_PERIOD',
                  to: {
                    type: 'PERIOD',
                    slug: 'siglo-xx',
                  },
                },
              },
            },
            {
              artist: {
                is: {
                  country: {
                    equals: 'Francia / Estados Unidos',
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it('ignores nationality when the requested catalog type is not artist', async () => {
    await service.list({
      type: 'ARTWORK',
      nationality: 'España',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTWORK',
        status: 'PUBLISHED',
      },
    });
  });

  it('lists published artwork institutions as lightweight filter options', async () => {
    prisma.artworkDetails.findMany.mockResolvedValue([
      { location: ' Museo del Prado, Madrid ' },
      { location: 'Museo del Prado, Madrid' },
      { location: 'MoMA, New York' },
      { location: '   ' },
    ]);

    await expect(service.listInstitutions()).resolves.toEqual([
      'MoMA, New York',
      'Museo del Prado, Madrid',
    ]);
  });

  it('lists published artist nationalities as lightweight filter options', async () => {
    prisma.artistDetails.findMany.mockResolvedValue([
      { country: ' España ' },
      { country: 'México' },
      { country: 'España' },
      { country: 'Francia / Estados Unidos' },
      { country: '  ' },
    ]);

    await expect(service.listNationalities()).resolves.toEqual([
      'España',
      'Francia / Estados Unidos',
      'México',
    ]);
  });

  it('loads home sections from published entities only', async () => {
    await service.home();

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: 'ARTWORK',
          status: 'PUBLISHED',
        },
      }),
    );
  });

  it('loads public entity detail by slug from published entities only', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
      mediaLinks: [],
      outgoing: [],
      incoming: [],
    });

    await service.getBySlug('guernica');

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'guernica',
          status: 'PUBLISHED',
        },
      }),
    );
  });

  it('loads graph center and preview by slug from published entities only', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
      mediaLinks: [],
      summary: null,
      startYear: null,
      endYear: null,
    });

    await service.graphBySlug('guernica');
    await service.previewBySlug('guernica');

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'guernica',
          status: 'PUBLISHED',
        },
      }),
    );
  });

  it('loads admin preview by slug without forcing published status', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'draft-guernica',
      title: 'Draft Guernica',
      type: 'ARTWORK',
      status: 'DRAFT',
      mediaLinks: [],
      summary: null,
      startYear: null,
      endYear: null,
    });

    await service.adminPreviewBySlug('draft-guernica');

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'draft-guernica',
        },
      }),
    );
  });

  it('includes artists associated with a movement when applying the movement filter', async () => {
    await service.list({
      type: 'ARTIST',
      movement: 'arte-contemporaneo',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'arte-contemporaneo',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('includes Louise Bourgeois in arte-contemporaneo through ASSOCIATED_WITH', async () => {
    await service.list({
      type: 'ARTIST',
      movement: 'arte-contemporaneo',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'arte-contemporaneo',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('includes Frida Kahlo in arte-moderno through ASSOCIATED_WITH', async () => {
    await service.list({
      type: 'ARTIST',
      movement: 'arte-moderno',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'arte-moderno',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('includes Francisco de Goya in romanticismo through ASSOCIATED_WITH', async () => {
    await service.list({
      type: 'ARTIST',
      movement: 'romanticismo',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        type: 'ARTIST',
        status: 'PUBLISHED',
        AND: [
          {
            outgoing: {
              some: {
                type: {
                  in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
                },
                to: {
                  type: 'MOVEMENT',
                  slug: 'romanticismo',
                },
              },
            },
          },
        ],
      },
    });
  });
});
