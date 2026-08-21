import { Test, TestingModule } from '@nestjs/testing';
import { EntityReadService } from './entity-read.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntityMediaService } from '../media/entity-media.service';
import { EntityGraphService } from './entity-graph.service';
import { EntityEditorialService } from './entity-editorial.service';
import { EntityCatalogService } from './entity-catalog.service';

describe('EntityReadService.list filters', () => {
  let service: EntityReadService;
  let catalogService: EntityCatalogService;
  let graphService: EntityGraphService;
  let editorialService: EntityEditorialService;

  const prisma = {
    $transaction: jest.fn(),
    entityTypeDefinition: {
      findMany: jest.fn(),
    },
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
    prisma.entityTypeDefinition.findMany.mockReset();
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
    prisma.entityTypeDefinition.findMany.mockResolvedValue(
      [
        'ARTWORK',
        'ARTIST',
        'ARTICLE',
        'CONCEPT',
        'MOVEMENT',
        'PERIOD',
        'TEXT',
        'PLACE',
        'EVENT',
        'ORGANIZATION',
      ].map((key) => ({ key, singularName: key })),
    );
    prisma.entity.delete.mockResolvedValue({ id: 'entity-id' });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown> | unknown) => callback(prisma),
    );
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
        EntityReadService,
        EntityCatalogService,
        EntityGraphService,
        EntityEditorialService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityMediaService, useValue: { normalizeLegacyPrimary: jest.fn() } },
      ],
    }).compile();

    service = module.get(EntityReadService);
    catalogService = module.get(EntityCatalogService);
    graphService = module.get(EntityGraphService);
    editorialService = module.get(EntityEditorialService);
  });

  it('applies movement and period relation filters together with type, status and contentLevel', async () => {
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
                relationType: { key: { in: ['BELONGS_TO_PERIOD'] } },
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

  it('combines canonical kind with the legacy type filter', async () => {
    await catalogService.list({
      type: 'ARTWORK',
      kind: 'WORK',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: { type: 'ARTWORK', kind: 'WORK', status: 'PUBLISHED' },
    });
  });

  it('connects every entity type to the JANO workspace center before entity nodes', async () => {
    const graph = await graphService.adminWorkspaceGraph('es');
    const typeHubs = graph.nodes.filter((node) => node.id.startsWith('workspace-type-'));

    expect(typeHubs.map((node) => node.type)).toEqual([
      'ARTWORK',
      'ARTIST',
      'ARTICLE',
      'CONCEPT',
      'MOVEMENT',
      'PERIOD',
      'TEXT',
      'PLACE',
      'EVENT',
      'ORGANIZATION',
    ]);
    expect(graph.edges.filter((edge) => edge.source === 'workspace-center-jano')).toHaveLength(
      typeHubs.length,
    );
  });

  it('filters by a canonical taxonomy term', async () => {
    await catalogService.list({
      taxonomy: 'person-role',
      term: 'artist',
      page: 1,
      limit: 24,
      sort: 'recent',
    });

    expect(prisma.entity.count).toHaveBeenCalledWith({
      where: {
        status: 'PUBLISHED',
        AND: [
          {
            classifications: {
              some: {
                term: {
                  key: 'artist',
                  isActive: true,
                  taxonomy: { key: 'person-role', isActive: true },
                },
              },
            },
          },
        ],
      },
    });
  });

  it('requires a taxonomy when filtering by term', async () => {
    await expect(
      catalogService.list({ term: 'artist', page: 1, limit: 24, sort: 'recent' }),
    ).rejects.toThrow('taxonomy is required when term is provided');
  });

  it('combines text search with relation filters inside AND so filters remain composable', async () => {
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
    await catalogService.adminList({
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
    await expect(editorialService.remove('entity-1')).resolves.toEqual({ ok: true });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.relation.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ fromId: 'entity-1' }, { toId: 'entity-1' }],
      },
    });
    expect(prisma.entityMedia.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.sourceRef.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.contributor.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.curatorNote.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.entityTag.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.homeDeckItem.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.collectionEntity.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.savedEntity.deleteMany).toHaveBeenCalledWith({ where: { entityId: 'entity-1' } });
    expect(prisma.artworkDetails.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.artistDetails.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.conceptDetails.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.periodDetails.deleteMany).toHaveBeenCalledWith({
      where: { entityId: 'entity-1' },
    });
    expect(prisma.entity.delete).toHaveBeenCalledWith({ where: { id: 'entity-1' } });
    expect(prisma.source.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps admin list unrestricted by default so drafts remain visible in admin workflows', async () => {
    await catalogService.adminList({
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

  it('orders the admin archive by last edit without changing public recent ordering', async () => {
    await catalogService.adminList({
      page: 1,
      limit: 24,
      sort: 'updated',
    });

    expect(prisma.entity.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: 'desc' },
      }),
    );

    await catalogService.list({
      page: 1,
      limit: 24,
      sort: 'updated',
    });

    expect(prisma.entity.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(prisma.entity.findMany.mock.calls.at(-1)?.[0]?.include).not.toHaveProperty('_count');
  });

  it('returns compact editorial signals without mistaking the public fallback for real media', async () => {
    prisma.entity.findMany.mockResolvedValueOnce([
      {
        id: 'entity-1',
        type: 'CONCEPT',
        title: 'Memoria cultural',
        slug: 'memoria-cultural',
        summary: 'Una definición editorial.',
        content: 'Contenido conectado.',
        status: 'DRAFT',
        translations: [
          {
            locale: 'es',
            title: 'Memoria cultural',
            shortDescription: 'Una definición editorial.',
            essay: 'Contenido conectado.',
          },
          {
            locale: 'en',
            title: 'Cultural memory',
            shortDescription: null,
            essay: null,
          },
        ],
        tags: [],
        classifications: [
          {
            confidence: 0.9,
            source: 'MANUAL',
            term: {
              id: 'term-1',
              key: 'artist',
              label: 'Artist',
              taxonomy: { id: 'taxonomy-1', key: 'person-role', label: 'Person role' },
            },
          },
        ],
        mediaLinks: [],
        _count: {
          outgoing: 2,
          incoming: 1,
          sourceRefs: 4,
        },
      },
    ]);

    const result = await catalogService.adminList({
      page: 1,
      limit: 24,
      sort: 'updated',
    });

    expect(prisma.entity.findMany.mock.calls.at(-1)?.[0]?.include?._count).toEqual({
      select: {
        outgoing: true,
        incoming: true,
        sourceRefs: true,
      },
    });
    expect(prisma.entity.findMany.mock.calls.at(-1)?.[0]?.include?.classifications).toEqual(
      expect.objectContaining({
        select: expect.objectContaining({
          confidence: true,
          source: true,
          term: expect.any(Object),
        }),
      }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        classifications: [
          expect.objectContaining({
            confidence: 0.9,
            source: 'MANUAL',
            term: expect.objectContaining({ key: 'artist' }),
          }),
        ],
        editorialSummary: {
          visualSource: 'empty',
          relationsCount: 3,
          sourcesCount: 4,
          translationStatus: {
            es: 'complete',
            en: 'partial',
          },
        },
      }),
    );
    expect(result.items[0]).not.toHaveProperty('_count');
  });

  it('passes the filtered where clause through to findMany for the paged list query', async () => {
    await catalogService.list({
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
                  relationType: { key: { in: ['BELONGS_TO_PERIOD'] } },
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
    await catalogService.list({
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
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
                relationType: { key: { in: ['BELONGS_TO_PERIOD'] } },
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
    await catalogService.list({
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
    await catalogService.list({
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
    await catalogService.list({
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
    await catalogService.list({
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
                  relationType: {
                    key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
                  relationType: { key: { in: ['BELONGS_TO_PERIOD'] } },
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
    await catalogService.list({
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

    await expect(catalogService.listInstitutions()).resolves.toEqual([
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

    await expect(catalogService.listNationalities()).resolves.toEqual([
      'España',
      'Francia / Estados Unidos',
      'México',
    ]);
  });

  it('loads one Home card for every active type, even without a published entity', async () => {
    prisma.entityTypeDefinition.findMany.mockResolvedValue([
      {
        id: 'type-meme',
        key: 'MEME',
        singularName: 'Meme',
        pluralName: 'Memes',
        description: 'Formato cultural reproducible.',
        icon: 'M',
        colorToken: 'violet',
        baseKind: 'ABSTRACTION',
        systemType: false,
      },
    ]);

    await catalogService.home();

    expect(prisma.entityTypeDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } }),
    );
    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: 'MEME',
          status: 'PUBLISHED',
        },
      }),
    );
    await expect(catalogService.home()).resolves.toEqual([
      expect.objectContaining({ type: expect.objectContaining({ key: 'MEME' }), entity: null }),
    ]);
  });

  it('loads public entity detail by slug from published entities only', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica legacy',
      type: 'ARTWORK',
      summary: 'Resumen legacy',
      content: 'Contenido legacy',
      translations: [
        {
          locale: 'en',
          title: 'Guernica',
          shortDescription: 'English summary',
          essay: 'English essay',
        },
      ],
      mediaLinks: [],
      outgoing: [
        {
          id: 'relation-1',
          justification: null,
          translations: [],
          relationType: {
            key: 'RELATED_TO',
            label: 'Relacionado con',
            inverseLabel: 'Relacionado con',
            directed: false,
            translations: [],
          },
          to: {
            id: 'entity-2',
            slug: 'moma',
            title: 'MoMA',
            type: 'PLACE',
            translations: [],
            mediaLinks: [],
          },
        },
      ],
      incoming: [],
    });

    const result = await service.getBySlug('guernica', 'en');

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'guernica',
          status: 'PUBLISHED',
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'entity-1',
        slug: 'guernica',
        title: 'Guernica',
        summary: 'English summary',
        content: 'English essay',
        translationMeta: expect.objectContaining({
          requestedLocale: 'en',
          resolvedLocale: 'en',
          isFallback: false,
        }),
        resolvedMedia: expect.any(Object),
        outgoing: [
          expect.objectContaining({
            type: 'RELATED_TO',
            relationTypeKey: 'RELATED_TO',
            directed: false,
          }),
        ],
        incoming: [],
      }),
    );
  });

  it('exposes published attributes and public citation evidence only', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
      summary: null,
      content: null,
      translations: [],
      mediaLinks: [],
      attributes: [
        {
          id: 'attribute-1',
          locale: 'und',
          valueText: 'Madrid',
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          valueYear: null,
          valueJson: null,
          confidence: 0.9,
          validFromYear: null,
          validToYear: null,
          definition: {
            id: 'definition-1',
            key: 'location',
            label: 'Ubicación',
            valueType: 'TEXT',
            isMultiple: false,
          },
          citations: [
            {
              id: 'citation-1',
              stance: 'SUPPORTS',
              locator: 'p. 12',
              quote: 'Madrid',
              source: {
                id: 'source-1',
                type: 'BOOK',
                title: 'Catálogo',
                author: null,
                publisher: null,
                year: 1937,
                url: null,
              },
            },
          ],
        },
      ],
      outgoing: [],
      incoming: [],
    });

    const result = await service.getBySlug('guernica');
    const include = prisma.entity.findFirst.mock.calls.at(-1)?.[0]?.include;

    expect(include.attributes.where).toEqual({ status: 'PUBLISHED' });
    expect(include.attributes.include.citations.select).not.toHaveProperty('note');
    expect(result.attributes).toEqual([
      expect.objectContaining({
        id: 'attribute-1',
        valueText: 'Madrid',
        citations: [
          expect.objectContaining({
            stance: 'SUPPORTS',
            source: expect.objectContaining({ title: 'Catálogo' }),
          }),
        ],
      }),
    ]);
  });

  it('loads graph center and preview by slug from published entities only', async () => {
    prisma.entity.findFirst.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
      mediaLinks: [],
      summary: null,
      kind: 'WORK',
      startYear: null,
      endYear: null,
    });

    const result = await graphService.graphBySlug('guernica');
    await service.previewBySlug('guernica');

    expect(prisma.entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'guernica',
          status: 'PUBLISHED',
        },
      }),
    );
    expect(result).toEqual({
      centerId: 'entity-1',
      nodes: [
        expect.objectContaining({
          id: 'entity-1',
          label: 'Guernica',
          type: 'ARTWORK',
          kind: 'WORK',
          slug: 'guernica',
          image: expect.any(String),
          resolvedMedia: expect.any(Object),
          metadata: {
            summary: null,
            startYear: null,
            endYear: null,
          },
        }),
      ],
      edges: [],
      filters: {
        entityTypes: ['ARTWORK'],
        entityKinds: ['WORK'],
        relationTypes: [],
      },
    });
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
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
    await catalogService.list({
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
                relationType: {
                  key: { in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'] },
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
