import { SourcesService } from './sources.service';

describe('SourcesService', () => {
  it('searches canonical sources independently of Research', async () => {
    const prisma = { source: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new SourcesService(prisma as never);

    await service.search({ q: '  Prado  ', limit: 5 });

    expect(prisma.source.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { title: { contains: 'Prado', mode: 'insensitive' } },
          { author: { contains: 'Prado', mode: 'insensitive' } },
          { publisher: { contains: 'Prado', mode: 'insensitive' } },
          { url: { contains: 'Prado', mode: 'insensitive' } },
          {
            translations: {
              some: {
                OR: [
                  { title: { contains: 'Prado', mode: 'insensitive' } },
                  { author: { contains: 'Prado', mode: 'insensitive' } },
                  { publisher: { contains: 'Prado', mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { translations: { orderBy: { locale: 'asc' } } },
    });
  });
});
