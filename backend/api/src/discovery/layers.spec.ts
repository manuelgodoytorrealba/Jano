import { facetCounts, LAYER_KEYS, matchesLayers, parseLayers } from './layers';
const items = [
  { id: 'a', values: { type: ['ARTWORK'], color: ['red', 'red'], author: ['matisse'] } },
  { id: 'b', values: { type: ['ARTWORK'], color: ['blue'], author: ['matisse'] } },
  { id: 'c', values: { type: ['ARTIST'], color: ['red'], author: ['other'] } },
];
describe('discovery layers', () => {
  it('uses OR within a layer and AND between layers', () => {
    expect(
      items
        .filter((item) => matchesLayers(item, { color: ['red', 'blue'], type: ['ARTWORK'] }))
        .map((i) => i.id),
    ).toEqual(['a', 'b']);
  });
  it('counts each entity once, ignores its own facet and keeps selected zero options', () => {
    const facets = facetCounts(items, { type: ['ARTWORK'], color: ['red', 'missing'] });
    expect(facets.map((f) => f.key)).toEqual([...LAYER_KEYS]);
    expect(facets.find((f) => f.key === 'color')!.options).toEqual([
      { value: 'blue', label: 'blue', count: 1 },
      { value: 'missing', label: 'missing', count: 0 },
      { value: 'red', label: 'red', count: 1 },
    ]);
    expect(facets.find((f) => f.key === 'type')!.options.map((o) => o.count)).toEqual([1, 1]);
  });
  it('validates untrusted layers and removes duplicates', () => {
    expect(parseLayers('{"type":["ARTWORK","ARTWORK"]}')).toEqual({ type: ['ARTWORK'] });
    for (const raw of [
      '[]',
      'null',
      '{"unknown":["a"]}',
      '{"type":"ARTWORK"}',
      '{"type":[1]}',
      JSON.stringify({ tag: Array(17).fill('x') }),
    ])
      expect(() => parseLayers(raw)).toThrow();
  });
});
