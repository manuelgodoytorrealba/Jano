import {
  mapRelation,
  relationTypeCompatibility,
  RELATION_CONTRACTS,
  type MappingInput,
} from './relation-mapping';

describe('relation mapping safety', () => {
  const input = (predicate: string | null, proposition: string): MappingInput => ({
    source: { id: 'artist', title: 'Picasso', type: 'PERSON', canonicalType: 'ARTIST' },
    target: { id: 'movement', title: 'Cubismo', type: 'ABSTRACTION', canonicalType: 'MOVEMENT' },
    predicate,
    proposition,
    quotes: [proposition],
  });
  it('defines all 17 existing contracts without inventing predicates', () => {
    expect(Object.keys(RELATION_CONTRACTS)).toHaveLength(17);
    expect(RELATION_CONTRACTS.CHILD_OF).toBeUndefined();
  });
  it('uses canonical types and explicit membership', () => {
    expect(
      mapRelation(input('BELONGS_TO_MOVEMENT', 'Picasso pertenece al movimiento Cubismo.'))
        .classification,
    ).toBe('VALID_RELATION');
  });
  it('normalizes direction only when explicit evidence supports the reversed triple', () => {
    const value = input('BELONGS_TO_MOVEMENT', 'Picasso pertenece al movimiento Cubismo.');
    const result = mapRelation({ ...value, source: value.target, target: value.source });
    expect(result.classification).toBe('VALID_RELATION');
    expect(result.source.id).toBe('artist');
  });
  it('never treats movement as period', () => {
    expect(
      mapRelation(input('BELONGS_TO_PERIOD', 'Picasso pertenece al movimiento Cubismo.'))
        .classification,
    ).toBe('REVIEW_MAPPING');
  });
  it('never treats period as movement', () => {
    const value = input('BELONGS_TO_MOVEMENT', 'Picasso belongs to Siglo XX.');
    value.target = { title: 'Siglo XX', type: 'PERIOD' };
    expect(mapRelation(value).classification).toBe('REVIEW_MAPPING');
  });
  it('supports movement influenced by artist without narrowing the catalog ontology', () => {
    expect(
      relationTypeCompatibility(
        'INFLUENCED_BY',
        { title: 'Cubismo', type: 'MOVEMENT' },
        { title: 'Cézanne', type: 'ARTIST' },
      ),
    ).toBe('VALID');
  });
  it.each([
    'Picasso se instaló en París en 1904.',
    'Picasso vivió en Barcelona.',
    'Ai Qing es el padre de Ai Weiwei.',
  ])('keeps no-predicate literal assertions out of relation acceptance: %s', (proposition) => {
    expect(mapRelation(input(null, proposition)).classification).toBe('ASSERTION_INSTEAD');
  });
  it('blocks parenthood encoded as authorship', () => {
    const value = input('CREATED_BY', 'Ai Weiwei es hijo de Ai Qing.');
    value.target = { title: 'Ai Qing', type: 'PERSON' };
    expect(mapRelation(value).classification).toBe('REVIEW_MAPPING');
  });
  it.each(['Nancy Spero', 'Ana Mendieta', 'Georges Braque'])(
    'does not infer a relation from co-occurrence: %s',
    (title) => {
      const value = input('BELONGS_TO_MOVEMENT', `${title} belongs to Cubismo.`);
      value.source.title = title;
      value.quotes = [`A page mentions ${title} and Cubismo.`];
      expect(mapRelation(value).classification).not.toBe('VALID_RELATION');
    },
  );
  it('does not derive influence from criticism', () => {
    const value = input('INSPIRED_BY', 'Braque was inspired by Vauxcelles.');
    value.quotes = ['Vauxcelles commented on Braque’s paintings.'];
    expect(mapRelation(value).classification).toBe('REVIEW_MAPPING');
  });
  it('does not drop qualifiers or accept negated, quoted or subordinated evidence', () => {
    const value = input('BELONGS_TO_MOVEMENT', 'Picasso pertenece al movimiento Cubismo.');
    for (const quote of [
      'No es cierto: ' + value.proposition,
      'Alguien afirmó «' + value.proposition + '»',
      'Quizás ' + value.proposition,
    ]) {
      expect(mapRelation({ ...value, quotes: [quote] }).classification).toBe('REVIEW_MAPPING');
    }
  });
  it('preserves the complete proposition and blocked endpoints', () => {
    const value = input(
      'INFLUENCED_BY',
      'Cubismo was partly influenced by Cézanne’s late work and different viewpoints.',
    );
    expect(mapRelation(value).proposition).toBe(value.proposition);
    expect(
      mapRelation({ ...value, source: { ...value.source, blocked: true } }).classification,
    ).toBe('BLOCKED_BY_ENTITY');
  });
});
