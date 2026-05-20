import { describe, expect, it } from 'vitest';
import { resolveEdgeLabelOcclusion, resolveNodeLabelOcclusion } from './graph-label-layout';
import { GraphRenderedEdge, GraphRenderedNode } from './graph.models';

function createNode(overrides: Partial<GraphRenderedNode>): GraphRenderedNode {
  return {
    node: {
      id: 'node',
      label: 'Node',
      type: 'ARTWORK',
      slug: 'node',
      degree: 1,
    },
    point: { x: 0, y: 0 },
    transform: 'translate(0 0)',
    selected: false,
    muted: false,
    size: 22,
    haloSize: 34,
    shapePath: '',
    labelTransform: 'translate(40 0)',
    labelTextAnchor: 'start',
    nodeVisual: {
      label: 'Obra',
      color: '#4f8fba',
      accent: '#d2edf9',
      textColor: '#ecf8ff',
      halo: 'rgba(79, 143, 186, 0.22)',
      icon: 'O',
      shape: 'square',
    },
    titleLabel: 'Node',
    typeLabel: 'Obra',
    ...overrides,
  };
}

function createEdge(overrides: Partial<GraphRenderedEdge>): GraphRenderedEdge {
  return {
    edge: {
      id: 'edge',
      source: 'a',
      target: 'b',
      relationType: 'RELATED_TO',
      label: 'Relacionado con',
      directed: false,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
    path: '',
    labelPoint: { x: 0, y: 0 },
    muted: false,
    relationVisual: {
      label: 'Relacionado con',
      color: '#94a3b8',
      width: 1.5,
      style: 'solid',
      directed: false,
    },
    markerId: 'edge',
    dasharray: '',
    displayLabel: 'Relacionado con',
    ...overrides,
  };
}

describe('graph-label-layout', () => {
  it('keeps a forced node label even when it overlaps a lower-priority node label', () => {
    const center = createNode({
      node: { id: 'center', label: 'Center', type: 'ARTWORK', slug: 'center', degree: 8 },
      titleLabel: 'Center',
    });
    const neighbor = createNode({
      node: { id: 'neighbor', label: 'Neighbor', type: 'ARTWORK', slug: 'neighbor', degree: 1 },
      titleLabel: 'Neighbor',
      point: { x: 8, y: 0 },
    });

    const visible = resolveNodeLabelOcclusion({
      nodes: [center, neighbor],
      requestedVisibility: { center: true, neighbor: true },
      centerId: 'center',
      selectedNodeId: null,
      hoveredNodeId: null,
      scale: 1,
    });

    expect(visible.center).toBe(true);
    expect(visible.neighbor).toBeUndefined();
  });

  it('drops a lower-priority edge label when it collides with an occupied node label region', () => {
    const edge = createEdge({
      edge: {
        id: 'edge-1',
        source: 'x',
        target: 'y',
        relationType: 'RELATED_TO',
        label: 'Relacionado con',
        directed: false,
        weight: 1,
        parallelIndex: 0,
        parallelTotal: 1,
      },
      labelPoint: { x: 60, y: 0 },
    });

    const visible = resolveEdgeLabelOcclusion({
      edges: [edge],
      requestedVisibility: { 'edge-1': true },
      centerId: 'other-center',
      selectedNodeId: null,
      hoveredEdgeId: null,
      scale: 1,
      occupiedBoxes: [{ left: 20, right: 104, top: -18, bottom: 20 }],
    });

    expect(visible['edge-1']).toBeUndefined();
  });
});
