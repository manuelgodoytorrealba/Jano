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
    expect(sql.text.includes('rank() OVER')).toBe(!materialized);
    expect(sql.text.includes('WHERE candidate.priority <=')).toBe(!materialized);
    expect(sql.text).toContain('e."id" ASC');
    expect(sql.text).toContain(`"status" = 'PUBLISHED'`);
  });

  it.each([
    ['arte moderno', true],
    ['música clásica', true],
    ['arte\tmoderno', true],
    ['de la', true],
    ['arte', false],
    ['arte OR pintura', false],
    ['arte or pintura', false],
    ['arte -moderno', false],
    ['"arte moderno"', false],
    ['arte%', false],
  ])('only prechecks required lexemes for plain conjunction %s', async (query, precheck) => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    await new SearchQueryRepository(prisma as never).search(query, {
      limit: 12,
      types: [],
      kinds: [],
      locale: 'es',
      includeDrafts: false,
    });
    const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
    const sql = Prisma.sql(strings, ...values);
    expect(sql.text.includes('tsvector_to_array')).toBe(precheck);
    expect(sql.text.includes('ILIKE ALL')).toBe(precheck);
    expect(sql.values).toContain(query);
    if (precheck) expect(sql.text).toContain('WHERE length(term) >= 4');
  });
});
