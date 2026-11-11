import { Prisma } from '@prisma/client';
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

  it.each([
    ['arte', false],
    ['japonés', false],
    ['arte moderno', true],
    ['arte OR pintura', true],
    ['"arte"', true],
  ])('reuses the full-text document only for structured query %s', async (query, materialized) => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const repository = new SearchQueryRepository(prisma as never);
    await repository.search(query, {
      limit: 20,
      types: [],
      kinds: [],
      locale: 'es',
      includeDrafts: false,
    });
    const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
    const sql = Prisma.sql(strings, ...values);
    expect(sql.text.includes('OFFSET 0')).toBe(materialized);
    expect(sql.text).toContain(`"status" = 'PUBLISHED'`);
  });
});
