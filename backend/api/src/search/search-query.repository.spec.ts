import { SearchQueryRepository } from './search-query.repository';

describe('SearchQueryRepository', () => {
  it('binds canonical kinds as SQL parameters', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const repository = new SearchQueryRepository(prisma as never);

    await repository.search('guernica', {
      limit: 20,
      types: [],
      kinds: ['WORK'],
      locale: 'es',
      includeDrafts: false,
    });

    expect(JSON.stringify(prisma.$queryRaw.mock.calls)).toContain('WORK');
  });
});
