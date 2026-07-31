import { describe, expect, it } from 'vitest';
import type { ResearchKnowledge } from '../../../core/api/research.api';
import { adaptResearchKnowledgeToVisualGraph } from './research-knowledge-visual-adapter';

const knowledge = {
  projectId: 'research-1',
  scope: 'topology',
  focus: null,
  expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
  entities: [
    { id: 'entity-b', title: 'Obra B', kind: 'WORK', summary: null },
    { id: 'entity-a', title: 'Artista A', kind: 'PERSON', summary: 'Investigación privada' },
  ],
  relations: [
    {
      id: 'relation-b',
      fromEntityId: 'entity-b',
      toEntityId: 'entity-a',
      relationTypeId: null,
      explanation: null,
      claims: [
        {
          relationId: 'relation-b',
          claimId: 'claim-contradiction',
          claim: { id: 'claim-contradiction', kind: 'CONTRADICTION', status: 'CONTRADICTED' },
        },
      ],
    },
    {
      id: 'relation-a',
      fromEntityId: 'entity-a',
      toEntityId: 'entity-b',
      relationTypeId: 'INFLUENCED',
      explanation: 'Hipótesis privada',
      claims: [
        {
          relationId: 'relation-a',
          claimId: 'claim-supported',
          claim: { id: 'claim-supported', kind: 'ASSERTION', status: 'SUPPORTED' },
        },
      ],
    },
  ],
  claims: [{ id: 'claim-supported' }],
  contradictions: [{ id: 'claim-contradiction' }],
  supportingEvidence: [{ id: 'evidence-1', libraryExcerpt: { id: 'excerpt-1' } }],
} as ResearchKnowledge;

describe('adaptResearchKnowledgeToVisualGraph', () => {
  it('maps only private Entities and Relations deterministically without mutation', () => {
    const snapshot = structuredClone(knowledge);

    const first = adaptResearchKnowledgeToVisualGraph(knowledge);
    const second = adaptResearchKnowledgeToVisualGraph(knowledge);

    expect(first).toEqual(second);
    expect(knowledge).toEqual(snapshot);
    expect(first.nodes).toEqual([
      {
        id: 'entity-a',
        entityId: 'entity-a',
        label: 'Artista A',
        kind: 'PERSON',
        summary: 'Investigación privada',
      },
      { id: 'entity-b', entityId: 'entity-b', label: 'Obra B', kind: 'WORK', summary: null },
    ]);
    expect(first.edges.map((edge) => edge.id)).toEqual(['relation-a', 'relation-b']);
    expect(first).toMatchObject({
      indicators: { claimCount: 2, contradictionCount: 1, hasContradictions: true },
    });
  });

  it('does not create visual nodes for Claims, Evidence, or LibraryExcerpt', () => {
    const graph = adaptResearchKnowledgeToVisualGraph(knowledge);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.every((node) => node.entityId.startsWith('entity-'))).toBe(true);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        relationId: 'relation-a',
        sourceEntityId: 'entity-a',
        targetEntityId: 'entity-b',
        indicators: { claimCount: 1, contradictionCount: 0, hasContradictions: false },
      }),
      expect.objectContaining({
        relationId: 'relation-b',
        sourceEntityId: 'entity-b',
        targetEntityId: 'entity-a',
        indicators: { claimCount: 1, contradictionCount: 1, hasContradictions: true },
      }),
    ]);
  });

  it('rejects complete Knowledge to prevent an accidental full Graph load', () => {
    expect(() => adaptResearchKnowledgeToVisualGraph({ ...knowledge, scope: 'complete' })).toThrow(
      'Research visual graphs require a progressive Knowledge scope',
    );
  });
});
