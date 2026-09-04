import { computeCoverage, researchPriority } from './knowledge-coverage';

describe('deterministic knowledge coverage', () => {
  const base = {
    id: 'entity',
    title: 'Entity',
    type: 'ARTIST',
    kind: 'PERSON',
    status: 'PUBLISHED',
    startYear: null,
    endYear: null,
    summary: null,
    content: null,
    contentLevel: null,
    sources: 0,
    citations: 0,
    assertions: 0,
    attributes: 0,
    relations: 0,
    media: 0,
  };

  it('derives transparent needs without model calls', () => {
    const profile = computeCoverage(base);
    expect(profile.dimensions.DOCUMENTARY_SOURCES).toMatchObject({
      state: 'MISSING',
      applicable: true,
    });
    expect(profile.needs).toContain('NEEDS_DOCUMENTARY_SOURCE');
    expect(profile.needs).toContain('NEEDS_CHRONOLOGY');
    expect(researchPriority(profile, 0)).toBeGreaterThan(0);
  });

  it('is type-aware for chronology', () => {
    expect(
      computeCoverage({ ...base, type: 'CONCEPT', kind: 'ABSTRACTION' }).dimensions.CHRONOLOGY
        .applicable,
    ).toBe(false);
  });

  it('becomes strong from canonical state rather than prose inference', () => {
    const profile = computeCoverage({
      ...base,
      startYear: 1881,
      endYear: 1973,
      summary: 's',
      content: 'c',
      contentLevel: 'ADVANCED',
      sources: 3,
      citations: 3,
      assertions: 5,
      attributes: 2,
      relations: 8,
      media: 2,
      contextAssertions: 3,
    });
    expect(profile.overall).toBe('STRONG');
    expect(profile.needs).toEqual([]);
  });
});
