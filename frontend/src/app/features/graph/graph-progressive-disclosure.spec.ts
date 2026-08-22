import { describe, expect, it } from 'vitest';
import { GraphData } from './graph.models';
import { buildGraphDerivedState, ensureGraphSelectionVisible } from './graph-derived';
import {
  initialRelationshipLimit,
  nextRelationshipLimit,
  previousRelationshipLimit,
  selectProgressiveRelationships,
} from './graph-progressive-disclosure';

const graph: GraphData = {
  centerId: 'center',
  entityTypes: ['WORK', 'PERSON'],
  relationTypes: ['CREATED_BY', 'ASSOCIATED_WITH'],
  nodes: [
    {
      id: 'center',
      label: 'Center',
      type: 'CONCEPT',
      kind: 'ABSTRACTION',
      slug: 'center',
      degree: 4,
    },
    { id: 'work-a', label: 'Work A', type: 'ARTWORK', kind: 'WORK', slug: 'work-a', degree: 2 },
    { id: 'work-b', label: 'Work B', type: 'ARTWORK', kind: 'WORK', slug: 'work-b', degree: 1 },
    { id: 'person', label: 'Person', type: 'ARTIST', kind: 'PERSON', slug: 'person', degree: 3 },
  ],
  edges: [
    {
      id: 'a',
      source: 'center',
      target: 'work-a',
      relationType: 'ASSOCIATED_WITH',
      label: '',
      directed: false,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
    {
      id: 'b',
      source: 'center',
      target: 'work-b',
      relationType: 'ASSOCIATED_WITH',
      label: '',
      directed: false,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
    {
      id: 'c',
      source: 'center',
      target: 'person',
      relationType: 'CREATED_BY',
      label: '',
      directed: true,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
    {
      id: 'd',
      source: 'center',
      target: 'work-a',
      relationType: 'CREATED_BY',
      label: '',
      directed: true,
      weight: 1,
      parallelIndex: 0,
      parallelTotal: 1,
    },
  ],
};

describe('progressive graph disclosure', () => {
  it('is deterministic, diverse, and eventually exposes every relationship', () => {
    const first = selectProgressiveRelationships({ graph, edges: graph.edges, limit: 3 });
    expect(first.map((edge) => edge.id)).toEqual(['c', 'd', 'b']);
    expect(new Set(first.flatMap((edge) => [edge.source, edge.target]))).toContain('person');
    expect(selectProgressiveRelationships({ graph, edges: graph.edges, limit: 4 })).toHaveLength(4);
  });

  it('keeps small nodes complete and expands hubs in bounded batches', () => {
    expect(initialRelationshipLimit(5, false)).toBe(5);
    expect(initialRelationshipLimit(98, false)).toBe(12);
    expect(nextRelationshipLimit(12, 98, false)).toBe(24);
    expect(previousRelationshipLimit(36, 98, false)).toBe(24);
    expect(previousRelationshipLimit(24, 98, false)).toBe(12);
    expect(initialRelationshipLimit(218, true)).toBe(8);
  });

  it('applies filters before the cap and returns focus to the visible center', () => {
    const filtered = buildGraphDerivedState({
      graph,
      entityTypeFilters: { WORK: true, PERSON: false },
      relationTypeFilters: { CREATED_BY: true, ASSOCIATED_WITH: true },
      selectedNodeId: 'person',
      hoveredNodeId: null,
      hoveredEdgeId: null,
      labelsMode: 'auto',
      labelScaleBucket: 1,
      viewportScale: 1,
      overviewMode: false,
      showAllOverviewRelations: false,
      relationshipLimit: 4,
    });
    expect(filtered.totalRelationshipCount).toBe(3);
    expect(ensureGraphSelectionVisible(graph, 'person', filtered.visibleNodeIds)).toBe('center');
  });
});
