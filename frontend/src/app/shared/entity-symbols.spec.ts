import { describe, expect, it } from 'vitest';
import { ENTITY_SYMBOLS, entitySymbol } from './entity-symbols';
describe('entity symbols', () => {
  it('uses the selected containers and the movement wave symbol', () => {
    for (const type of ['PERSON', 'WORK', 'CONCEPT', 'PERIOD', 'PLACE']) {
      expect(entitySymbol(type).shape).toBe('rounded-square');
    }
    expect(entitySymbol('MOVEMENT').shape).toBe('diamond');
    expect(entitySymbol('MOVEMENT').path).toContain('c5 4');
  });
  it('keeps specific types consistent across graph kinds and relation endpoints', () => {
    expect(entitySymbol('ARTIST', 'PERSON')).toBe(entitySymbol('PERSON'));
    expect(entitySymbol('ARTWORK', 'WORK')).toBe(entitySymbol('WORK'));
    expect(entitySymbol('MOVEMENT', 'ABSTRACTION')).toBe(ENTITY_SYMBOLS.MOVEMENT);
    expect(entitySymbol('CONCEPT', 'ABSTRACTION')).toBe(ENTITY_SYMBOLS.CONCEPT);
  });
  it('uses a known kind or a neutral symbol for custom types', () => {
    expect(entitySymbol('CUSTOM', 'PERSON')).toBe(ENTITY_SYMBOLS.PERSON);
    expect(entitySymbol('CUSTOM')).toBe(ENTITY_SYMBOLS.ENTITY);
  });
});
