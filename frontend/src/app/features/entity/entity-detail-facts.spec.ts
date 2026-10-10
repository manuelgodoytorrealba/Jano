import { describe, expect, it } from 'vitest';
import { PublicEntity } from '../../core/api/entities.models';
import { detailFacts } from './entity-detail.presenter';

describe('artwork information sheet', () => {
  const context = { locale: 'es', t: (key: string) => key };
  it('uses recorded dates and existing relationships even without technical artwork fields', () => {
    const entity = {
      type: 'ARTWORK',
      startYear: 1940,
      endYear: 1940,
      outgoing: [
        { type: 'CREATED_BY', to: { title: 'Manuela Ballester' } },
        { type: 'BELONGS_TO_MOVEMENT', to: { title: 'Realismo' } },
        { type: 'ABOUT_CONCEPT', to: { title: 'Representación' } },
      ],
    } as unknown as PublicEntity;
    expect(detailFacts(entity, context)).toEqual([
      { label: 'entity.fact.authorship', value: 'Manuela Ballester' },
      { label: 'entity.fact.type', value: 'entities.type.artworkSingular' },
      { label: 'entity.fact.date', value: '1940' },
      { label: 'entity.fact.movement', value: 'Realismo' },
      { label: 'entity.fact.concepts', value: 'Representación' },
    ]);
  });
  it('preserves technical facts and does not invent a missing date or author', () => {
    const facts = detailFacts(
      { type: 'ARTWORK', artwork: { technique: 'Óleo' } } as PublicEntity,
      context,
    );
    expect(facts).toContainEqual({ label: 'entity.fact.technique', value: 'Óleo' });
    expect(
      facts.some(
        (fact) => fact.label === 'entity.fact.date' || fact.label === 'entity.fact.authorship',
      ),
    ).toBe(false);
  });
});
