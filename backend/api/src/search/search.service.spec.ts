import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const prisma = {
    $queryRaw: jest.fn(),
    entity: {
      findMany: jest.fn(),
    },
    relation: {
      findMany: jest.fn(),
    },
    homeDeck: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    prisma.entity.findMany.mockReset();
    prisma.relation.findMany.mockReset();
    prisma.homeDeck.findMany.mockReset();
    prisma.relation.findMany.mockResolvedValue([]);
    prisma.homeDeck.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('returns locale-resolved titles and summaries for search results', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'entity-1',
        score: 42,
        matched_title: true,
        matched_summary: false,
        matched_content: false,
        matched_slug: false,
      },
    ]);

    prisma.entity.findMany.mockResolvedValue([
      {
        id: 'entity-1',
        slug: 'guernica',
        type: 'ARTWORK',
        title: 'Guernica',
        summary: 'Resumen base',
        content: 'Contenido base',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
        startYear: 1937,
        endYear: null,
        tags: [],
        mediaLinks: [],
        translations: [
          {
            locale: 'en',
            title: 'Guernica (EN)',
            shortDescription: 'English summary',
            essay: 'English content',
          },
        ],
      },
    ]);

    const result = await service.search(
      { q: 'english', locale: 'en' },
      { includeDrafts: false },
    );

    expect(prisma.entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          translations: {
            where: {
              locale: { in: ['en', 'es'] },
            },
          },
        }),
      }),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'entity-1',
        title: 'Guernica (EN)',
        summary: 'English summary',
        matchedFields: ['title'],
      }),
    ]);
    expect(result.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'main', title: 'Resultados principales' }),
    ]));
  });


  it('keeps artist key works to authored artworks and moves related artworks to related section', async () => {
    const picasso = {
      id: 'artist-1',
      slug: 'pablo-picasso',
      type: 'ARTIST',
      title: 'Pablo Picasso',
      summary: 'Artist',
      content: null,
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      startYear: 1881,
      endYear: 1973,
      tags: [],
      mediaLinks: [],
      translations: [],
    };
    const guernica = {
      id: 'artwork-1',
      slug: 'guernica',
      type: 'ARTWORK',
      title: 'Guernica',
      summary: 'Artwork by Picasso',
      content: null,
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      startYear: 1937,
      endYear: null,
      tags: [],
      mediaLinks: [],
      translations: [],
    };
    const goyaWork = {
      id: 'artwork-2',
      slug: 'el-tres-de-mayo-de-1808',
      type: 'ARTWORK',
      title: 'El tres de mayo de 1808',
      summary: 'Related artwork by Goya',
      content: null,
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      startYear: 1814,
      endYear: null,
      tags: [],
      mediaLinks: [],
      translations: [],
    };

    prisma.$queryRaw.mockResolvedValue([
      { id: 'artist-1', score: 20, matched_title: true, matched_summary: false, matched_content: false, matched_slug: true },
      { id: 'artwork-1', score: 10, matched_title: false, matched_summary: true, matched_content: false, matched_slug: false },
    ]);
    prisma.entity.findMany.mockResolvedValue([picasso, guernica]);
    prisma.relation.findMany.mockResolvedValue([
      { type: 'CREATED_BY', weight: 1, from: guernica, to: picasso, relationType: { translations: [] } },
      { type: 'RELATED_TO', weight: 0.7, from: guernica, to: goyaWork, justification: 'Both works address war violence.', translations: [], relationType: { translations: [] } },
    ]);

    const result = await service.search(
      { q: 'picasso', locale: 'es' },
      { includeDrafts: false },
    );

    const keyWorks = result.sections.find((section: any) => section.key === 'keyWorks');
    const relatedWorks = result.sections.find((section: any) => section.key === 'relatedWorks');

    expect(keyWorks?.items.map((item: any) => item.id)).toEqual(['artwork-1']);
    expect(relatedWorks?.title).toBe('Obras relacionadas');
    expect(relatedWorks?.items.map((item: any) => item.id)).toEqual(['artwork-2']);
    expect(relatedWorks?.items[0].relationReason).toBe('Both works address war violence.');
    expect(relatedWorks?.items[0].relationWithTitle).toBe('Guernica');
  });

  it('searches translation fields in the raw query pipeline', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.search(
      { q: 'picasso', locale: 'en' },
      { includeDrafts: false },
    );

    const sql = prisma.$queryRaw.mock.calls[0]?.[0];

    expect(String(sql)).toContain('"EntityTranslation"');
    expect(String(sql)).toContain('translated.title_text');
    expect(String(sql)).toContain('translated.summary_text');
    expect(String(sql)).toContain('translated.content_text');
  });
});
