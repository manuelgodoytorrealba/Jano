import 'reflect-metadata';
import { feedOrder } from './entity-feed-order';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListEntitiesQuery } from './dto/list-entities.query';

describe('discovery feed ordering', () => {
  const ids = Array.from({ length: 80 }, (_, i) => `entity-${i}`);

  it('keeps the order stable across pages and database input order', () => {
    const ordered = feedOrder(ids, 'visit-one');
    expect(feedOrder([...ids].reverse(), 'visit-one')).toEqual(ordered);
    expect(new Set([...ordered.slice(0, 24), ...ordered.slice(24, 48)]).size).toBe(48);
    expect([...ordered].sort()).toEqual([...ids].sort());
  });

  it('renews the first selection with a new seed', () => {
    expect(feedOrder(ids, 'visit-two').slice(0, 24)).not.toEqual(
      feedOrder(ids, 'visit-one').slice(0, 24),
    );
    expect(feedOrder([], 'empty')).toEqual([]);
  });

  it('rejects malformed or oversized seeds at the API boundary', () => {
    for (const seed of ['../unsafe', 'a'.repeat(65)]) {
      expect(
        validateSync(plainToInstance(ListEntitiesQuery, { seed })).some(
          (error) => error.property === 'seed',
        ),
      ).toBe(true);
    }
    expect(validateSync(plainToInstance(ListEntitiesQuery, { seed: 'valid-seed-1' }))).toEqual([]);
  });
});
