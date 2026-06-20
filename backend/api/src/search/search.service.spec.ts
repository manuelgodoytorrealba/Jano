import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SearchIntentService } from './search-intent.service';
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
  const searchIntent = {
    interpret: jest.fn(),
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    prisma.entity.findMany.mockReset();
    prisma.relation.findMany.mockReset();
    prisma.homeDeck.findMany.mockReset();
    searchIntent.interpret.mockReset();
    prisma.relation.findMany.mockResolvedValue([]);
    prisma.homeDeck.findMany.mockResolvedValue([]);
    searchIntent.interpret.mockImplementation((q: string, locale: string) => ({
      rawQuery: q,
      locale,
      normalizedQuery: q,
      significantTerms: q ? [q] : [],
      signals: [],
      variants: q ? [{ query: q, reason: 'raw query', weight: 1 }] : [],
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: SearchIntentService, useValue: searchIntent },
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
        matched_alias: false,
        matched_tag: false,
        matched_detail: false,
        matched_relation: false,
        trigram_score: 0,
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
        aliases: [],
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
          aliases: expect.any(Object),
        }),
      }),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'entity-1',
        title: 'Guernica (EN)',
        summary: 'English summary',
        matchedFields: ['title'],
        matchReasons: ['Matched via title'],
      }),
    ]);
    expect(result.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'main',
          title: 'Resultados principales',
        }),
      ]),
    );
    expect(result.interpretation).toEqual(
      expect.objectContaining({
        normalizedQuery: 'english',
        variantsTried: [{ query: 'english', reason: 'raw query' }],
      }),
    );
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
      aliases: [],
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
      aliases: [],
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
      aliases: [],
      mediaLinks: [],
      translations: [],
    };

    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'artist-1',
        score: 20,
        matched_title: true,
        matched_summary: false,
        matched_content: false,
        matched_slug: true,
        matched_alias: false,
        matched_tag: false,
        matched_detail: false,
        matched_relation: false,
        trigram_score: 0.8,
      },
      {
        id: 'artwork-1',
        score: 10,
        matched_title: false,
        matched_summary: true,
        matched_content: false,
        matched_slug: false,
        matched_alias: false,
        matched_tag: false,
        matched_detail: false,
        matched_relation: false,
        trigram_score: 0.2,
      },
    ]);
    prisma.entity.findMany.mockResolvedValue([picasso, guernica]);
    prisma.relation.findMany.mockResolvedValue([
      {
        type: 'CREATED_BY',
        weight: 1,
        from: guernica,
        to: picasso,
        relationType: { translations: [] },
      },
      {
        type: 'RELATED_TO',
        weight: 0.7,
        from: guernica,
        to: goyaWork,
        justification: 'Both works address war violence.',
        translations: [],
        relationType: { translations: [] },
      },
    ]);

    const result = await service.search(
      { q: 'picasso', locale: 'es' },
      { includeDrafts: false },
    );

    const keyWorks = result.sections.find(
      (section: any) => section.key === 'keyWorks',
    );
    const relatedWorks = result.sections.find(
      (section: any) => section.key === 'relatedWorks',
    );

    expect(keyWorks?.total).toBe(1);
    expect(keyWorks?.items.map((item: any) => item.id)).toEqual(['artwork-1']);
    expect(relatedWorks?.title).toBe('Obras relacionadas');
    expect(relatedWorks?.total).toBe(1);
    expect(relatedWorks?.items.map((item: any) => item.id)).toEqual([
      'artwork-2',
    ]);
    expect(relatedWorks?.items[0].relationReason).toBe(
      'Both works address war violence.',
    );
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
    expect(String(sql)).toContain('"EntityAlias"');
    expect(String(sql)).toContain('"TagTranslation"');
    expect(String(sql)).toContain('"ArtworkDetails"');
    expect(String(sql)).toContain('"RelationTranslation"');
    expect(String(sql)).toContain('translated.title_text');
    expect(String(sql)).toContain('alias_data.alias_text');
    expect(String(sql)).toContain('tag_data.tag_text');
    expect(String(sql)).toContain('detail_data.detail_text');
    expect(String(sql)).toContain('relation_data.relation_text');
    expect(String(sql)).toContain('translated.summary_text');
    expect(String(sql)).toContain('translated.content_text');
  });

  it('returns alias matches as explicit match reasons', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'entity-1',
        score: 64,
        matched_title: false,
        matched_summary: false,
        matched_content: false,
        matched_slug: false,
        matched_alias: true,
        matched_tag: true,
        matched_detail: false,
        matched_relation: false,
        trigram_score: 0.72,
      },
    ]);

    prisma.entity.findMany.mockResolvedValue([
      {
        id: 'entity-1',
        slug: 'himitsubako',
        type: 'CONCEPT',
        title: 'Himitsubako',
        summary: 'Caja de rompecabezas japonesa.',
        content: null,
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
        startYear: null,
        endYear: null,
        tags: [{ tag: { id: 'tag-1', label: 'Japan', translations: [] } }],
        aliases: [
          {
            id: 'alias-1',
            locale: 'es',
            value: 'caja japonesa secreta',
            kind: 'SEARCH_HINT',
            weight: 1,
          },
        ],
        mediaLinks: [],
        translations: [],
      },
    ]);

    const result = await service.search(
      { q: 'caja japonesa secreta', locale: 'es' },
      { includeDrafts: false },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        matchedFields: ['alias', 'tag'],
        matchReasons: ['Matched via alternate name', 'Matched via taxonomy'],
      }),
    );
  });

  it('returns structured detail matches as explicit reasons', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'entity-2',
        score: 38,
        matched_title: false,
        matched_summary: false,
        matched_content: false,
        matched_slug: false,
        matched_alias: false,
        matched_tag: false,
        matched_detail: true,
        matched_relation: true,
        trigram_score: 0.41,
      },
    ]);

    prisma.entity.findMany.mockResolvedValue([
      {
        id: 'entity-2',
        slug: 'fountain',
        type: 'ARTWORK',
        title: 'Fountain',
        summary: 'Ready-made de Duchamp.',
        content: null,
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
        startYear: 1917,
        endYear: 1917,
        tags: [],
        aliases: [],
        mediaLinks: [],
        translations: [],
      },
    ]);

    const result = await service.search(
      { q: 'porcelain urinal museum object', locale: 'en' },
      { includeDrafts: false },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        matchedFields: ['detail', 'relation_text'],
        matchReasons: [
          'Matched via structured detail',
          'Matched via graph context',
        ],
      }),
    );
  });

  it('tries interpreted variants and merges the strongest result', async () => {
    searchIntent.interpret.mockReturnValue({
      rawQuery: 'caja japonesa secreta',
      locale: 'es',
      normalizedQuery: 'caja japonesa secreta',
      significantTerms: ['caja', 'japonesa', 'secreta'],
      signals: [{ kind: 'culture', value: 'japan' }],
      variants: [
        { query: 'caja japonesa secreta', reason: 'raw query', weight: 1 },
        {
          query: 'himitsubako japanese puzzle box',
          reason: 'common misspelling rewrite',
          weight: 0.96,
        },
      ],
    });

    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'entity-3',
        score: 50,
        matched_title: false,
        matched_summary: false,
        matched_content: false,
        matched_slug: false,
        matched_alias: true,
        matched_tag: true,
        matched_detail: true,
        matched_relation: false,
        trigram_score: 0.67,
      },
    ]);

    prisma.entity.findMany.mockResolvedValue([
      {
        id: 'entity-3',
        slug: 'himitsubako',
        type: 'CONCEPT',
        title: 'Himitsubako',
        summary: 'Caja japonesa.',
        content: null,
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
        startYear: null,
        endYear: null,
        tags: [],
        aliases: [],
        mediaLinks: [],
        translations: [],
      },
    ]);

    const result = await service.search(
      { q: 'caja japonesa secreta', locale: 'es' },
      { includeDrafts: false },
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: 'himitsubako',
        matchedFields: ['alias', 'tag', 'detail'],
      }),
    );
    expect(result.interpretation).toEqual(
      expect.objectContaining({
        normalizedQuery: 'caja japonesa secreta',
        signals: [{ kind: 'culture', value: 'japan' }],
        variantsTried: [
          { query: 'caja japonesa secreta', reason: 'raw query' },
          {
            query: 'himitsubako japanese puzzle box',
            reason: 'common misspelling rewrite',
          },
        ],
      }),
    );
  });
});
