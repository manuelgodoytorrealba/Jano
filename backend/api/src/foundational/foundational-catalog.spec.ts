import { entities, foundationalExpectations, relations } from '../../prisma/foundational/catalog';
import { RELATION_TYPES } from '../../prisma/foundational/relation-types';

describe('Foundational Knowledge catalog', () => {
  it('has deterministic unique slugs and a complete expectation checklist', () => {
    const slugs = entities.map((entity) => entity.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(foundationalExpectations.every((slug) => slugs.includes(slug))).toBe(true);
  });

  it('contains only valid relation endpoints and no duplicate edges', () => {
    const slugs = new Set(entities.map((entity) => entity.slug));
    const keys = relations.map((edge) => `${edge.from}:${edge.type}:${edge.to}`);
    expect(relations.every((edge) => slugs.has(edge.from) && slugs.has(edge.to))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    const validTypes = new Set<string>(RELATION_TYPES.map(([key]) => key));
    expect(relations.every((edge) => validTypes.has(edge.type))).toBe(true);
  });

  it('keeps canonical bilingual records and searchable slugs', () => {
    expect(entities.every((entity) => entity.title.trim() && entity.en.trim())).toBe(true);
    expect(entities.every((entity) => /^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u.test(entity.slug))).toBe(
      true,
    );
    expect(new Set(entities.flatMap((entity) => entity.aliases ?? [])).size).toBe(
      entities.flatMap((entity) => entity.aliases ?? []).length,
    );
  });

  it('does not define editorial or private seeded content', () => {
    expect(
      entities.some((entity) => entity.type === 'ARTIST' && entity.slug.includes('article')),
    ).toBe(false);
  });
});
