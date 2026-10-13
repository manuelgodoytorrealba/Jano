import { describe, expect, it } from 'vitest';
import { toGraphData } from './graph-setup';

describe('toGraphData', () => {
  it('uses canonical entity kinds for graph filters', () => {
    const graph = toGraphData({
      centerId: 'person-1',
      nodes: [
        { id: 'person-1', label: 'Leonardo', slug: 'leonardo', type: 'ARTIST', kind: 'PERSON' },
      ],
      edges: [],
      filters: { entityTypes: ['ARTIST'], entityKinds: ['PERSON'], relationTypes: [] },
    });

    expect(graph.entityTypes).toEqual(['PERSON']);
  });
});

it('separates specific abstraction types consistently with the displayed filters', () => {
  const graph = toGraphData({
    centerId: 'concept',
    nodes: ['CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE'].map((type) => ({
      id: type.toLowerCase(),
      label: type,
      slug: type.toLowerCase(),
      type,
      kind: 'ABSTRACTION',
    })),
    edges: [],
    filters: {
      entityTypes: ['CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE'],
      entityKinds: ['ABSTRACTION'],
      relationTypes: [],
    },
  });
  expect([...graph.entityTypes].sort()).toEqual(['CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE']);
});
