import { semanticCacheKey } from './semantic-result-cache.service';

describe('semantic cache contract', () => {
  const input = {
    classifierVersion: 'semantic-evidence-v3',
    model: 'qwen2.5:14b',
    excerptFingerprint: 'excerpt-a',
    candidateEntityFingerprint: 'entity-a',
    input: { excerpt: 'text', target: 'Picasso' },
  };

  it('is stable for equivalent object key order', () => {
    expect(semanticCacheKey(input).cacheKey).toBe(
      semanticCacheKey({ ...input, input: { target: 'Picasso', excerpt: 'text' } }).cacheKey,
    );
  });

  it.each([
    'classifierVersion',
    'model',
    'excerptFingerprint',
    'candidateEntityFingerprint',
  ] as const)('invalidates when %s changes', (field) => {
    expect(semanticCacheKey({ ...input, [field]: `${input[field]}-changed` }).cacheKey).not.toBe(
      semanticCacheKey(input).cacheKey,
    );
  });
});
