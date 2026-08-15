import { describe, expect, it } from 'vitest';
import { entityTypeLabel, statusLabel } from './domain-labels';

describe('domain labels', () => {
  it('uses the active translation lookup instead of exposing enum values', () => {
    const es = { t: (key: string) => ({ 'entities.type.artworkSingular': 'Obra' })[key] ?? key };
    const en = { t: (key: string) => ({ 'entities.type.artworkSingular': 'Artwork' })[key] ?? key };

    expect(entityTypeLabel('ARTWORK', es)).toBe('Obra');
    expect(entityTypeLabel('ARTWORK', en)).toBe('Artwork');
    expect(
      entityTypeLabel('RESEARCH', {
        t: (key: string) => (key === 'entity.research' ? 'Research' : key),
      }),
    ).toBe('Research');
    expect(
      statusLabel('PUBLISHED', {
        t: (key: string) => (key === 'status.published' ? 'Published' : key),
      }),
    ).toBe('Published');
  });
});
