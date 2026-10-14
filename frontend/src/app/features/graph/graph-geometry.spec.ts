import { describe, expect, it } from 'vitest';
import { createGraphFocusedViewport } from './graph-geometry';
import { GraphData } from './graph.models';

describe('image graph initial framing', () => {
  it('fits screen-sized photos without adding a second world-space halo margin', () => {
    const graph: GraphData = {
      centerId: 'center',
      nodes: ['center', 'top', 'bottom'].map((id) => ({
        id,
        label: id,
        slug: id,
        type: 'ARTWORK',
        degree: 1,
        image: '/api/entities/' + id + '/graph-thumbnail',
      })),
      edges: [],
      entityTypes: ['ARTWORK'],
      relationTypes: [],
    };
    const options = {
      graph,
      size: { width: 800, height: 500 },
      positions: { center: { x: 0, y: 0 }, top: { x: 0, y: -450 }, bottom: { x: 0, y: 450 } },
      filteredNodeIds: ['center', 'top', 'bottom'],
      haloSizeForNode: () => 100,
      padding: 72,
    };
    const viewport = createGraphFocusedViewport(options)!;
    expect(viewport.scale).toBeCloseTo(356 / 900);
    expect(viewport.y - 450 * viewport.scale - 28).toBeGreaterThan(0);
    expect(viewport.y + 450 * viewport.scale + 28).toBeLessThan(500);
    const icons = createGraphFocusedViewport({
      ...options,
      graph: { ...graph, nodes: graph.nodes.map((node) => ({ ...node, image: null })) },
    })!;
    expect(viewport.scale).toBeGreaterThan(icons.scale);
  });
});
