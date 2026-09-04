import { assertionFingerprint, classifyAssertion } from './canonical-assertion.service';

describe('canonical assertion boundary', () => {
  const proposition = 'El cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne.';
  const existing = [{ proposition, normalizedFingerprint: assertionFingerprint(proposition) }];

  it('distinguishes exact duplicates and additional provenance', () => {
    expect(classifyAssertion(proposition, existing, { sameProvenance: true })).toBe(
      'EXACT_DUPLICATE',
    );
    expect(classifyAssertion(proposition, existing)).toBe('ADDITIONAL_PROVENANCE');
  });

  it('routes conflicts and overlap without aggressive equivalence', () => {
    expect(
      classifyAssertion('El cubismo no recibió influencia de Cézanne.', existing, {
        conflict: true,
      }),
    ).toBe('CONFLICTING_KNOWLEDGE');
    expect(
      classifyAssertion(
        'La obra tardía de Paul Cézanne influyó parcialmente en el cubismo europeo.',
        existing,
      ),
    ).not.toBe('EXACT_DUPLICATE');
  });
});
