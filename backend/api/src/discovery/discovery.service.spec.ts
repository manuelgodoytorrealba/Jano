import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryRepository } from '../search/search-query.repository';
import { SearchIntentService } from '../search/search-intent.service';

describe('published discovery metadata', () => {
  it('counts all candidates before pagination and excludes unpublished graph targets', async () => {
    const prisma = {
      entity: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a',
            type: 'ARTWORK',
            title: 'A',
            slug: 'a',
            contentLevel: null,
            translations: [],
            tags: [],
            outgoing: [],
            artwork: null,
            artist: null,
          },
          {
            id: 'b',
            type: 'ARTIST',
            title: 'B',
            slug: 'b',
            contentLevel: null,
            translations: [],
            tags: [],
            outgoing: [],
            artwork: null,
            artist: null,
          },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const service = new DiscoveryService(
      prisma as unknown as PrismaService,
      {} as SearchQueryRepository,
      new SearchIntentService(),
    );
    const result = await service.context({ layers: JSON.stringify({ type: ['ARTWORK'] }) });
    expect(result.ids).toEqual(['a']);
    expect(result.facets.find((f) => f.key === 'type')!.options).toHaveLength(2);
    const query = prisma.entity.findMany.mock.calls[0][0];
    expect(query.where.status).toBe('PUBLISHED');
    expect(query.select.outgoing.where).toEqual({
      status: 'PUBLISHED',
      to: { status: 'PUBLISHED' },
    });
    expect(query.take).toBeUndefined();
  });
});
