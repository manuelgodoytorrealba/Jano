import { resolveEntityTranslation } from './entity-translation.resolver';

describe('resolveEntityTranslation', () => {
  it('prefers canonical default editorial fields over stale Spanish translations', () => {
    const result = resolveEntityTranslation(
      {
        title: 'Arte conceptual',
        summary: 'Resumen editorial actualizado',
        content: 'Contenido editorial actualizado',
        translations: [
          {
            locale: 'es',
            title: 'Arte conceptual',
            shortDescription: 'Resumen legacy interno',
            essay: 'Contenido legacy interno',
          },
        ],
      },
      'es',
    );

    expect(result.summary).toBe('Resumen editorial actualizado');
    expect(result.content).toBe('Contenido editorial actualizado');
  });

  it('keeps localized English content when explicitly requested', () => {
    const result = resolveEntityTranslation(
      {
        title: 'Arte conceptual',
        summary: 'Resumen español',
        content: 'Contenido español',
        translations: [
          {
            locale: 'en',
            title: 'Conceptual art',
            shortDescription: 'English summary',
            essay: 'English essay',
          },
        ],
      },
      'en',
    );

    expect(result.summary).toBe('English summary');
    expect(result.content).toBe('English essay');
  });
});
