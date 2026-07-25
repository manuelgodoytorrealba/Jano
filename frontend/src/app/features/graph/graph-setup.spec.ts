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
