import { BENCHMARK_DATASET, provenanceReport } from '../../scripts/editorial-quality-benchmark';
import { RITUAL_BASIC_EXPLANATION } from './entity-editorial-generation.fixtures';

describe('editorial quality benchmark dataset', () => {
  it('contains 24 deliberately varied real seed cases', () => {
    expect(BENCHMARK_DATASET).toHaveLength(24);
    expect(new Set(BENCHMARK_DATASET.map((item) => item.slug)).size).toBe(24);
    expect(BENCHMARK_DATASET.map((item) => item.slug)).toEqual(
      expect.arrayContaining([
        'ritual',
        'pablo-picasso',
        'cubismo',
        'cueva-de-lascaux',
        'renacimiento',
        'paris',
      ]),
    );
  });

  it('keeps the requested distribution and corpus bands', () => {
    expect(
      Object.fromEntries(
        [...new Set(BENCHMARK_DATASET.map((item) => item.requestedType))].map((type) => [
          type,
          BENCHMARK_DATASET.filter((item) => item.requestedType === type).length,
        ]),
      ),
    ).toEqual({
      CONCEPT: 4,
      ARTIST: 4,
      ARTWORK: 4,
      MOVEMENT: 3,
      PERIOD: 3,
      PLACE: 3,
      EVENT: 1,
      ORGANIZATION: 1,
      ARTICLE: 1,
    });
    expect(new Set(BENCHMARK_DATASET.map((item) => item.corpus))).toEqual(new Set(['A', 'B', 'C']));
  });

  it('does not treat catalogue membership or an unquoted relation as evidence', () => {
    const report = provenanceReport(
      {
        definition: 'Una obra se usó en una ceremonia.',
        summary: 'La obra pertenece a Ritual.',
        essay: '## Contexto\nLa obra se usó en una ceremonia.',
      },
      {
        entityData: { canonicalName: 'Objeto', type: 'ARTWORK', metadata: {} },
        relations: [{ canonicalName: 'Ritual', type: 'ABOUT_CONCEPT' }],
        relationMetadata: [
          {
            canonicalName: 'Ritual',
            type: 'ABOUT_CONCEPT',
            justification: 'conexión editorial',
            citations: [],
          },
        ],
        availableEntities: [{ id: '1', slug: 'ritual', canonicalName: 'Ritual', type: 'CONCEPT' }],
        sources: [],
        documentaryContext: [],
      } as any,
    );
    expect(report.claims.some((claim) => claim.classification === 'UNSUPPORTED')).toBe(true);
    expect(report.claims.some((claim) => claim.classification === 'RELATION_EVIDENCE')).toBe(false);
  });

  it('keeps the depth-adjusted Ritual example within its documented premise', () => {
    expect(RITUAL_BASIC_EXPLANATION.summary).not.toMatch(/no toda repetición/i);
    expect(RITUAL_BASIC_EXPLANATION.essay).not.toMatch(/no toda repetición/i);
  });
});
