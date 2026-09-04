import { EntityTargetRouter } from './entity-target-router';

describe('EntityTargetRouter', () => {
  const router = new EntityTargetRouter();
  const artwork = {
    id: 'orgaz',
    name: 'El entierro del conde de Orgaz',
    type: 'ARTWORK',
    aliases: ['El entierro del señor de Orgaz'],
  };

  test.each([
    [
      '57',
      'De planta cuadrada y siguiendo el esquema de los alminares islámicos, en el interior conserva el machón central alrededor del cual se disponen las escaleras.',
    ],
    [
      '58',
      'Sobre el cuerpo inferior de mampostería encintada se superponen dos cuerpos en ladrillo en los que se abren ventanas con arcos de herradura para acoger el campanario.',
    ],
    [
      '59',
      'Entre los dos cuerpos destaca el friso de arcos ciegos polilobulados sostenidos por columnillas de cerámica vidriada.',
    ],
  ])('blocks Batch 02 critical wrong target %s', (excerptId, excerpt) => {
    const result = router.route({
      excerptId,
      excerpt,
      candidate: artwork,
      sourceTitle: artwork.name,
    });
    expect(result.targetStatus).toBe('TARGET_MISMATCH');
    expect(result.promotionEligible).toBe(false);
  });

  it('confirms an explicit target', () => {
    expect(
      router.route({
        excerptId: '1',
        excerpt: 'Pablo Picasso nació en Málaga en 1881.',
        candidate: { id: 'picasso', name: 'Pablo Picasso', type: 'ARTIST' },
      }).targetStatus,
    ).toBe('TARGET_CONFIRMED');
  });

  it('allows a genuine multi-entity relation', () => {
    const result = router.route({
      excerptId: '2',
      excerpt: 'El cubismo estuvo parcialmente influido por la obra tardía de Paul Cézanne.',
      candidate: { id: 'cubism', name: 'Cubismo', type: 'MOVEMENT' },
      catalog: [{ id: 'cezanne', name: 'Paul Cézanne', type: 'ARTIST' }],
    });
    expect(result.targetStatus).toBe('MULTI_ENTITY_VALID');
    expect(result.promotionEligible).toBe(true);
  });
});
