import { describe, expect, it } from 'vitest';
import type { ResearchKnowledge, ResearchProposal } from '../../../core/api/research.api';
import {
  adaptResearchKnowledgeToGraphData,
  adaptResearchKnowledgeToVisualGraph,
} from './research-knowledge-visual-adapter';

const knowledge = {
  projectId: 'research-1',
  scope: 'topology',
  focus: null,
  expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
  entities: [
    { id: 'entity-b', title: 'Obra B', kind: 'WORK', summary: null },
    { id: 'entity-a', title: 'Artista A', kind: 'PERSON', summary: 'Privada' },
  ],
  relations: [
    {
      id: 'relation-a',
      fromEntityId: 'entity-a',
      toEntityId: 'entity-b',
      relationTypeId: 'type-1',
      relationType: { id: 'type-1', key: 'CREATED_BY', label: 'Creada por' },
      explanation: 'Hipótesis privada',
      claims: [],
    },
  ],
  claims: [],
  contradictions: [],
  supportingEvidence: [],
} as unknown as ResearchKnowledge;

function proposal(data: Partial<ResearchProposal>): ResearchProposal {
  return {
    id: 'candidate-a',
    projectId: 'research-1',
    jobId: 'job-1',
    type: 'ENTITY',
    proposalKey: 'key-a',
    title: 'Candidata A',
    summary: null,
    entityKind: 'ABSTRACTION',
    relationFromKey: null,
    relationToKey: null,
    relationTypeId: null,
    explanation: null,
    reviewState: 'PENDING',
    createdAt: '',
    evidence: [],
    ...data,
  };
}

describe('Research Knowledge graph adapter', () => {
  it('maps Research Entities and Relations with readable relation labels', () => {
    const graph = adaptResearchKnowledgeToVisualGraph(knowledge);

    expect(graph.nodes.map((node) => node.id)).toEqual(['entity-a', 'entity-b']);
    expect(graph.edges).toEqual([
      expect.objectContaining({ relationTypeKey: 'CREATED_BY', label: 'Creada por' }),
    ]);
  });

  it('renders projected Knowledge Core relations as confirmed graph edges', () => {
    const graph = adaptResearchKnowledgeToGraphData(
      {
        ...knowledge,
        relations: [
          ...knowledge.relations,
          {
            ...knowledge.relations[0],
            id: 'core:relation-2',
            origin: 'KNOWLEDGE_CORE',
            canonicalRelationId: 'relation-2',
            relationType: { id: 'type-2', key: 'INFLUENCED', label: 'Influyó en' },
          },
        ],
      },
      [],
      false,
    );

    expect(graph.edges.find((edge) => edge.id === 'core:relation-2')).toMatchObject({
      source: 'entity-a',
      target: 'entity-b',
      label: 'Influyó en',
      state: 'confirmed',
    });
  });

  it('uses the shared graph contract and distinguishes candidate from confirmed state', () => {
    const proposals = [
      proposal({}),
      proposal({ id: 'candidate-b', proposalKey: 'key-b', title: 'Candidata B' }),
      proposal({
        id: 'candidate-relation',
        type: 'RELATION',
        proposalKey: 'relation-1',
        title: 'Explora',
        entityKind: null,
        relationFromKey: 'key-a',
        relationToKey: 'key-b',
        relationType: { id: 'type-2', key: 'ABOUT_CONCEPT', label: 'Explora' },
      }),
    ];
    const graph = adaptResearchKnowledgeToGraphData(knowledge, proposals, true);

    expect(graph.nodes.filter((node) => node.state === 'candidate')).toHaveLength(2);
    expect(graph.edges.find((edge) => edge.id === 'proposal:candidate-relation')).toMatchObject({
      label: 'Explora',
      state: 'candidate',
      source: 'proposal:candidate-a',
      target: 'proposal:candidate-b',
    });
    expect(graph.edges.find((edge) => edge.id === 'relation-a')).toMatchObject({
      label: 'Creada por',
      state: 'confirmed',
    });
  });

  it('does not connect endpoints from different analysis jobs', () => {
    const graph = adaptResearchKnowledgeToGraphData(
      knowledge,
      [
        proposal({ jobId: 'job-1' }),
        proposal({ id: 'candidate-b', jobId: 'job-2', proposalKey: 'key-b' }),
        proposal({
          id: 'relation',
          jobId: 'job-1',
          type: 'RELATION',
          relationFromKey: 'key-a',
          relationToKey: 'key-b',
        }),
      ],
      true,
    );

    expect(graph.edges.some((edge) => edge.id === 'proposal:relation')).toBe(false);
  });
});
