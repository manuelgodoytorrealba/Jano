import { Test, TestingModule } from '@nestjs/testing';
import { EntitiesService } from './entities.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EntitiesService.list filters', () => {
  let service: EntitiesService;

  const prisma = {
    entity: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma.entity.count.mockReset();
    prisma.entity.findMany.mockReset();
    prisma.entity.count.mockResolvedValue(0);
    prisma.entity.findMany.mockResolvedValue([]);

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
                type: 'BELONGS_TO_MOVEMENT',
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
        AND: [
          {
            OR: [
              { title: { contains: 'memoria', mode: 'insensitive' } },
              { summary: { contains: 'memoria', mode: 'insensitive' } },
              { content: { contains: 'memoria', mode: 'insensitive' } },
            ],
          },
          {
            outgoing: {
              some: {
                type: 'BELONGS_TO_MOVEMENT',
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
});
