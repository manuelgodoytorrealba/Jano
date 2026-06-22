import { describe, expect, it } from 'vitest';
import { GraphResponseDto } from '../../graph/graph.models';
import { createAdminGlobalGraphLayout } from './admin-global-graph-layout';

const graph: GraphResponseDto = {
  centerId: 'workspace-center-jano',
  nodes: [
    { id: 'workspace-center-jano', label: 'JANO', type: 'CONCEPT', slug: 'jano' },
    { id: 'workspace-type-ARTIST', label: 'Artists', type: 'ARTIST', slug: 'artists' },
    { id: 'workspace-type-ARTWORK', label: 'Artworks', type: 'ARTWORK', slug: 'artworks' },
    { id: 'artist-1', label: 'Artist', type: 'ARTIST', slug: 'artist' },
    { id: 'artwork-1', label: 'Artwork', type: 'ARTWORK', slug: 'artwork' },
  ],
  edges: [
    { id: 'relation-1', source: 'artist-1', target: 'artwork-1', relationType: 'CREATED_BY' },
  ],
};

describe('createAdminGlobalGraphLayout', () => {
  it('positions every node deterministically inside measurable bounds', () => {
    const first = createAdminGlobalGraphLayout(graph);
    const second = createAdminGlobalGraphLayout(graph);

    expect(Object.keys(first.positions)).toHaveLength(graph.nodes.length);
    expect(first.positions).toEqual(second.positions);
    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
  });

  it('keeps a representative multi-type graph circular', () => {
    const types = ['ARTIST', 'ARTWORK', 'CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE'];
    const circularGraph: GraphResponseDto = {
      centerId: 'workspace-center',
      nodes: [
        { id: 'workspace-center', label: 'JANO', type: 'CONCEPT', slug: 'jano' },
        ...types.flatMap((type) => [
          { id: `workspace-type-${type}`, label: type, type, slug: type },
          ...Array.from({ length: 4 }, (_, index) => ({
            id: `${type}-${index}`,
            label: `${type} ${index}`,
            type,
            slug: `${type}-${index}`,
          })),
        ]),
      ],
      edges: [],
    };

    const layout = createAdminGlobalGraphLayout(circularGraph);

    expect(layout.width / layout.height).toBeGreaterThan(0.8);
    expect(layout.width / layout.height).toBeLessThan(1.25);
  });

  it('does not mutate graph input', () => {
    const snapshot = structuredClone(graph);

    createAdminGlobalGraphLayout(graph);

    expect(graph).toEqual(snapshot);
  });
});
