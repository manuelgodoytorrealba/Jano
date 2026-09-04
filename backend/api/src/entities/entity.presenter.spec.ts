import { publicRelationJustification } from './entity.presenter';

describe('publicRelationJustification', () => {
  it('hides internal placeholders but preserves meaningful explanations', () => {
    expect(
      publicRelationJustification(
        'Guernica permite una lectura editorial relevante a través de Memoria.',
      ),
    ).toBeNull();
    expect(
      publicRelationJustification(
        'Guernica mantiene una asociación histórica o profesional con Guerra civil española.',
      ),
    ).toBeNull();
    expect(publicRelationJustification('La obra fue creada por Pablo Picasso en 1937.')).toBe(
      'La obra fue creada por Pablo Picasso en 1937.',
    );
  });
});
