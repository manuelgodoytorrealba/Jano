import type {
  ResearchKnowledge,
  ResearchProposal,
  ResearchRelation,
} from '../../../core/api/research.api';
import type { GraphResponseDto } from '../../../core/api/graph.models';

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
  proposalId?: string;
}

export interface ResearchVisualGraphEdge {
  id: string;
  relationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationTypeId: string | null;
  relationTypeKey: string;
  label: string;
  explanation: string | null;
  indicators: ResearchVisualGraphIndicators;
  proposalId?: string;
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
      relationTypeKey: relation.relationType?.key ?? relation.relationTypeId ?? 'RELATED_TO',
      label: relation.relationType?.label ?? 'Relaciona',
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

export function overlayResearchProposalsOnVisualGraph(
  graph: ResearchVisualGraphModel,
  proposals: ResearchProposal[],
): ResearchVisualGraphModel {
  const nodes = [...graph.nodes];
  const endpointIds = new Map<string, string>();
  const endpointKey = (proposal: ResearchProposal, key: string) => `${proposal.jobId ?? ''}:${key}`;

  for (const proposal of proposals) {
    if (proposal.type !== 'ENTITY' || !proposal.proposalKey || proposal.reviewState === 'REJECTED')
      continue;
    if (proposal.convertedEntityId) {
      if (nodes.some((node) => node.entityId === proposal.convertedEntityId)) {
        endpointIds.set(endpointKey(proposal, proposal.proposalKey), proposal.convertedEntityId);
      }
      continue;
    }
    if (proposal.reviewState !== 'PENDING') continue;
    const id = `proposal:${proposal.id}`;
    endpointIds.set(endpointKey(proposal, proposal.proposalKey), id);
    nodes.push({
      id,
      entityId: id,
      proposalId: proposal.id,
      label: proposal.title,
      kind: proposal.entityKind ?? 'ABSTRACTION',
      summary: proposal.summary,
    });
  }

  const edges = [...graph.edges];
  for (const proposal of proposals) {
    if (
      proposal.type !== 'RELATION' ||
      proposal.reviewState !== 'PENDING' ||
      proposal.convertedRelationId
    )
      continue;
    const sourceEntityId = endpointIds.get(endpointKey(proposal, proposal.relationFromKey ?? ''));
    const targetEntityId = endpointIds.get(endpointKey(proposal, proposal.relationToKey ?? ''));
    if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) continue;
    edges.push({
      id: `proposal:${proposal.id}`,
      relationId: `proposal:${proposal.id}`,
      proposalId: proposal.id,
      sourceEntityId,
      targetEntityId,
      relationTypeId: proposal.relationTypeId,
      relationTypeKey: proposal.relationType?.key ?? proposal.relationTypeId ?? 'RELATED_TO',
      label: proposal.relationType?.label ?? proposal.title,
      explanation: proposal.explanation,
      indicators: { claimCount: 0, contradictionCount: 0, hasContradictions: false },
    });
  }

  return { ...graph, nodes, edges };
}

export function adaptResearchKnowledgeToGraphData(
  knowledge: ResearchKnowledge,
  proposals: ResearchProposal[],
  showCandidates: boolean,
): GraphResponseDto {
  const graph = showCandidates
    ? overlayResearchProposalsOnVisualGraph(
        adaptResearchKnowledgeToVisualGraph(knowledge),
        proposals,
      )
    : adaptResearchKnowledgeToVisualGraph(knowledge);
  const centerId = graph.nodes.find((node) => !node.proposalId)?.id ?? graph.nodes[0]?.id ?? '';

  return {
    centerId,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      slug: node.id,
      label: node.label,
      type: node.kind,
      state: node.proposalId ? 'candidate' : 'confirmed',
      metadata: { summary: node.summary },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceEntityId,
      target: edge.targetEntityId,
      relationType: edge.relationTypeKey,
      label: edge.label,
      directed: true,
      justification: edge.explanation,
      state: edge.proposalId ? 'candidate' : 'confirmed',
    })),
    filters: {
      entityTypes: [...new Set(graph.nodes.map((node) => node.kind))],
      relationTypes: [...new Set(graph.edges.map((edge) => edge.relationTypeKey))],
    },
  };
}
