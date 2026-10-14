import { describe, expect, it } from 'vitest';
import { buildGraphDerivedState } from './graph-derived';
import { GraphData } from './graph.models';

const graph: GraphData = {
  centerId: 'center',
  nodes: ['center', 'neighbor', 'other'].map((id) => ({
    id,
    label: id,
    slug: id,
    type: 'ARTWORK',
    degree: 1,
  })),
  edges: [
    {
      id: 'edge',
      source: 'center',
      target: 'neighbor',
      relationType: 'CREATED_BY',
      label: 'Created by',
      directed: true,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
  ],
  entityTypes: ['ARTWORK'],
  relationTypes: ['CREATED_BY'],
};

function derive(
  selectedNodeId = 'center',
  hoveredNodeId: string | null = null,
  labelsMode: 'auto' | 'always' | 'hidden' = 'auto',
) {
  return buildGraphDerivedState({
    graph,
    selectedNodeId,
    hoveredNodeId,
    labelsMode,
    hoveredEdgeId: null,
    entityTypeFilters: {},
    relationTypeFilters: {},
    labelScaleBucket: 2,
    viewportScale: 2,
    overviewMode: false,
    showAllOverviewRelations: false,
    relationshipLimit: 20,
  });
}

describe('intentional graph labels', () => {
  it('keeps only the center label at rest even when zoomed in', () => {
    expect(derive().nodeLabelVisibility).toEqual({ center: true });
    expect(Object.values(derive().edgeLabelVisibility).some(Boolean)).toBe(false);
  });
  it('reveals a hovered node and a selected node’s direct route', () => {
    expect(derive('center', 'neighbor').nodeLabelVisibility).toEqual({
      center: true,
      neighbor: true,
    });
    expect(derive('neighbor').nodeLabelVisibility).toEqual({ center: true, neighbor: true });
    expect(derive('neighbor').edgeLabelVisibility['edge']).toBe(true);
  });
  it('preserves the explicit show-all and hide options', () => {
    expect(derive('center', null, 'always').nodeLabelVisibility).toEqual({
      center: true,
      neighbor: true,
    });
    expect(derive('center', null, 'hidden').nodeLabelVisibility).toEqual({});
  });
});
