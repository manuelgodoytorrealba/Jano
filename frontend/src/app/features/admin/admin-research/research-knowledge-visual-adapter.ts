import type { ResearchKnowledge, ResearchRelation } from '../../../core/api/research.api';

export type ResearchVisualGraphScope = Exclude<ResearchKnowledge['scope'], 'complete'>;

export interface ResearchVisualGraphIndicators {
  claimCount: number;
  contradictionCount: number;
  hasContradictions: boolean;
}

export interface ResearchVisualGraphNode {
  id: string;
  entityId: string;
  label: string;
  kind: string;
  summary: string | null;
}

export interface ResearchVisualGraphEdge {
  id: string;
  relationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationTypeId: string | null;
  explanation: string | null;
  indicators: ResearchVisualGraphIndicators;
}

export interface ResearchVisualGraphModel {
  projectId: string;
  scope: ResearchVisualGraphScope;
  nodes: ResearchVisualGraphNode[];
  edges: ResearchVisualGraphEdge[];
  indicators: ResearchVisualGraphIndicators;
}

function isContradiction(claim: NonNullable<ResearchRelation['claims']>[number]['claim']) {
  return claim?.kind === 'CONTRADICTION' || claim?.status === 'CONTRADICTED';
}

function indicatorsForRelation(relation: ResearchRelation): ResearchVisualGraphIndicators {
  const claims = relation.claims ?? [];
  const contradictionCount = claims.filter((item) => isContradiction(item.claim)).length;
  return {
    claimCount: claims.length,
    contradictionCount,
    hasContradictions: contradictionCount > 0,
  };
}

export function adaptResearchKnowledgeToVisualGraph(
  knowledge: ResearchKnowledge,
): ResearchVisualGraphModel {
  if (knowledge.scope === 'complete') {
    throw new Error('Research visual graphs require a progressive Knowledge scope');
  }

  const entities = [...knowledge.entities].sort((left, right) => left.id.localeCompare(right.id));
  const nodes = entities.map((entity) => ({
    id: entity.id,
    entityId: entity.id,
    label: entity.title,
    kind: entity.kind,
    summary: entity.summary,
  }));
  const edges = [...knowledge.relations]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((relation) => ({
      id: relation.id,
      relationId: relation.id,
      sourceEntityId: relation.fromEntityId,
      targetEntityId: relation.toEntityId,
      relationTypeId: relation.relationTypeId,
      explanation: relation.explanation,
      indicators: indicatorsForRelation(relation),
    }));
  const indicators = edges.reduce<ResearchVisualGraphIndicators>(
    (total, edge) => ({
      claimCount: total.claimCount + edge.indicators.claimCount,
      contradictionCount: total.contradictionCount + edge.indicators.contradictionCount,
      hasContradictions: total.hasContradictions || edge.indicators.hasContradictions,
    }),
    { claimCount: 0, contradictionCount: 0, hasContradictions: false },
  );

  return { projectId: knowledge.projectId, scope: knowledge.scope, nodes, edges, indicators };
}
