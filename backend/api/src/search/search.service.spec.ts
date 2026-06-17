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
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    prisma.entity.findMany.mockReset();

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
