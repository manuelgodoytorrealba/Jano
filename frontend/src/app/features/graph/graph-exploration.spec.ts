import { describe, expect, it } from 'vitest';
import { mergeExplorationGraph, placeExplorationNodes } from './graph-exploration';
import { toGraphData } from './graph-setup';
import { buildGraphDerivedState } from './graph-derived';

const node = (id: string) => ({ id, slug: id, label: id, type: 'CONCEPT' });
const edge = (id: string, source: string, target: string) => ({
  id,
  source,
  target,
  relationType: 'ABOUT_CONCEPT',
});
const graph = toGraphData({
  centerId: 'root',
  nodes: ['root', 'a', 'b', 'hidden'].map(node),
  edges: [edge('a', 'root', 'a'), edge('b', 'root', 'b'), edge('hidden', 'root', 'hidden')],
});

describe('cumulative graph exploration', () => {
  it('merges a second ring without recentering, replacing the first ring or duplicating data', () => {
    const response = {
      centerId: 'a',
      nodes: ['root', 'a', 'child'].map(node),
      edges: [edge('a', 'root', 'a'), edge('child', 'a', 'child')],
    };
    const merged = mergeExplorationGraph(mergeExplorationGraph(graph, response), response);
    expect(merged.centerId).toBe('root');
    expect(merged.nodes.map((n) => n.id)).toEqual(['root', 'a', 'b', 'hidden', 'child']);
    expect(merged.edges).toHaveLength(4);
    const derived = buildGraphDerivedState({
      graph: merged,
      entityTypeFilters: {},
      relationTypeFilters: {},
      selectedNodeId: 'a',
      hoveredNodeId: null,
      hoveredEdgeId: null,
      labelsMode: 'auto',
      labelScaleBucket: 1,
      viewportScale: 1,
      overviewMode: false,
      showAllOverviewRelations: false,
      relationshipLimit: 1,
      revealedNodeIds: new Set(['root', 'a', 'child']),
    });
    expect(derived.filteredNodes.map((n) => n.id)).toEqual(['root', 'a', 'child']);
    expect(derived.filteredEdges.map((e) => e.id)).toEqual(['a', 'child']);
  });

  it('keeps previous positions and places new labels clear of the occupied nodes', () => {
    const positions = { root: { x: 0, y: 0 }, a: { x: 170, y: 0 } };
    const next = placeExplorationNodes(
      ['child', 'another'],
      positions.a,
      positions,
      new Set(['root', 'a']),
    );
    expect(positions).toEqual({ root: { x: 0, y: 0 }, a: { x: 170, y: 0 } });
    expect(next['root']).toEqual(positions.root);
    expect(next['a']).toEqual(positions.a);
    for (const id of ['child', 'another']) {
      for (const old of ['root', 'a'])
        expect(
          Math.abs(next[id].x - next[old].x) >= 150 || Math.abs(next[id].y - next[old].y) >= 125,
        ).toBe(true);
    }
    expect(next['child']).not.toEqual(next['another']);
  });
});
