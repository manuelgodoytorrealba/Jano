import {
  buildEditorialGenerationRequest,
  INTERNAL_LANGUAGE,
  normalizeAndValidateEditorialOutput,
  type EditorialGenerationContext,
} from './entity-editorial-generation';
import {
  EDITORIAL_TYPE_FIXTURES,
  RITUAL_EDITORIAL_REGRESSION,
} from './entity-editorial-generation.fixtures';

const catalog = [
  { id: 'ritual', slug: 'ritual', canonicalName: 'Ritual', type: 'CONCEPT' },
  {
    id: 'lascaux',
    slug: 'cueva-de-lascaux',
    canonicalName: 'Pinturas de Lascaux',
    type: 'ARTWORK',
  },
];

describe('entity editorial generation contract', () => {
  it('gives the model grounded entity, relation, source and canonical catalog context', () => {
    const context: EditorialGenerationContext = {
      locale: 'es',
      entityData: { title: 'Ritual', type: 'CONCEPT' },
      relations: [{ target: 'Pinturas de Lascaux', type: 'ABOUT_CONCEPT' }],
      relationMetadata: [{ target: 'Pinturas de Lascaux', certainty: 'interpretation' }],
      availableEntities: catalog,
      sources: [{ title: 'Catálogo' }],
      documentaryContext: [{ quote: 'Zona profunda de la cueva' }],
    };
    const request = buildEditorialGenerationRequest(context);
    expect(request.schemaVersion).toBe('entity-editorial-v2');
    expect(request.input).toEqual(
      expect.objectContaining({
        ENTITY_DATA: context.entityData,
        RELATIONS: context.relations,
        RELATION_METADATA: context.relationMetadata,
        SOURCES: context.sources,
        DOCUMENTARY_CONTEXT: context.documentaryContext,
        AVAILABLE_ENTITIES: expect.arrayContaining([
          { canonicalName: 'Pinturas de Lascaux', type: 'ARTWORK' },
        ]),
      }),
    );
  });

  it.each(INTERNAL_LANGUAGE)('rejects internal product language: %s', (phrase) => {
    expect(() =>
      normalizeAndValidateEditorialOutput(
        {
          definition: 'Definición breve.',
          summary: `Ritual ${phrase}.`,
          essay: '## Qué significa\n\nExplicación concreta.',
        },
        catalog,
      ),
    ).toThrow(/forbidden/);
  });

  it('converts canonical [[Entity]] syntax to renderer-safe slug links', () => {
    const result = normalizeAndValidateEditorialOutput(RITUAL_EDITORIAL_REGRESSION, catalog);
    expect(result.summary).not.toContain('[[');
    expect(result.essay).toContain('[[cueva-de-lascaux|Pinturas de Lascaux]]');
  });

  it('rejects invented entity links', () => {
    expect(() =>
      normalizeAndValidateEditorialOutput(
        {
          definition: 'Definición breve.',
          summary: 'Texto autónomo sin enlaces.',
          essay: '## Un título\n\nTexto sobre [[Entidad inventada]].',
        },
        catalog,
      ),
    ).toThrow('Invented or unavailable entity link');
  });

  it('rejects rich text in summary and definition', () => {
    expect(() =>
      normalizeAndValidateEditorialOutput(
        {
          definition: 'Definición breve.',
          summary: 'Texto con [[Pinturas de Lascaux]].',
          essay: '## Un título\n\nTexto.',
        },
        catalog,
      ),
    ).toThrow('Summary must be plain text');
  });

  it.each(EDITORIAL_TYPE_FIXTURES)('supports a specific structure for $type', (fixture) => {
    expect(fixture.heading).toMatch(/^## /);
    expect(fixture.heading.toLocaleLowerCase()).not.toMatch(
      /contexto|relaciones de lectura|cómo continuar/,
    );
  });

  it('keeps Ritual autonomous, cautious and understandable from zero', () => {
    const result = normalizeAndValidateEditorialOutput(RITUAL_EDITORIAL_REGRESSION, catalog);
    expect(result.summary).toMatch(/^Un ritual es una acción/);
    expect(result.essay).toContain('no demuestra');
    expect(result.essay).toContain('presentarla como un hecho excedería la evidencia');
    const words = result.summary.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(100);
    expect(words).toBeLessThanOrEqual(180);
  });
});
