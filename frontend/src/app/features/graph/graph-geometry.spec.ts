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

describe('desktop spatial framing', () => {
  it('fits an asymmetric graph around its bounds, including complete photos and caption space', () => {
    const ids = ['center', 'top', 'left', 'right'];
    const graph: GraphData = {
      centerId: 'center',
      nodes: ids.map((id) => ({
        id,
        slug: id,
        label: id,
        type: 'ARTWORK',
        degree: 1,
        image: '/api/entities/' + id + '/graph-thumbnail',
      })),
      edges: [],
      entityTypes: ['ARTWORK'],
      relationTypes: [],
    };
    const positions = {
      center: { x: 0, y: 0 },
      top: { x: 0, y: -520 },
      left: { x: -340, y: 220 },
      right: { x: 340, y: 220 },
    };
    for (const filteredNodeIds of [ids, ['center', 'top'], ['center']]) {
      const viewport = createGraphFocusedViewport({
        graph,
        positions,
        size: { width: 600, height: 440 },
        filteredNodeIds,
        haloSizeForNode: () => 80,
        padding: 56,
        preferBoundsCenter: true,
        spatialNodes: true,
      })!;
      expect(viewport.scale).toBeLessThanOrEqual(0.9);
      for (const id of filteredNodeIds) {
        const p = positions[id as keyof typeof positions];
        const x = viewport.x + p.x * viewport.scale,
          y = viewport.y + p.y * viewport.scale;
        expect(x - 40 * viewport.scale).toBeGreaterThan(0);
        expect(x + 40 * viewport.scale).toBeLessThan(600);
        expect(y - 40 * viewport.scale).toBeGreaterThan(0);
        expect(y + 80 * viewport.scale).toBeLessThan(440);
      }
    }
  });
});
