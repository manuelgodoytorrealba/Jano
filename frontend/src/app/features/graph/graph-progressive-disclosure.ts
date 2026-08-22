import { graphNodeTypeKey, GraphData, GraphEdge, GraphNode } from './graph.models';

const RELATION_PRIORITY: Record<string, number> = {
  CREATED_BY: 100,
  INFLUENCED_BY: 95,
  BELONGS_TO_MOVEMENT: 90,
  USES_TECHNIQUE: 85,
  USES_MATERIAL: 85,
  HAS_SUBJECT: 80,
  ABOUT_CONCEPT: 75,
  LOCATED_IN: 70,
  PART_OF: 65,
  BELONGS_TO_PERIOD: 60,
  MENTIONS: 55,
  ASSOCIATED_WITH: 30,
};

export function isFocalRelationshipGraph(graph: GraphData, edges = graph.edges): boolean {
  return edges.every((edge) => edge.source === graph.centerId || edge.target === graph.centerId);
}

export function initialRelationshipLimit(total: number, isMobile: boolean): number {
  if (total <= (isMobile ? 10 : 16)) return total;
  // The P99 hubs in the foundational seed need a deliberately quieter first ring.
  return Math.min(total, isMobile ? (total >= 64 ? 8 : 10) : total >= 64 ? 12 : 16);
}

export function nextRelationshipLimit(current: number, total: number, isMobile: boolean): number {
  if (current >= total) return total;
  return Math.min(total, current + (isMobile ? 8 : 12));
}

export function previousRelationshipLimit(
  current: number,
  total: number,
  isMobile: boolean,
): number {
  return Math.max(initialRelationshipLimit(total, isMobile), current - (isMobile ? 8 : 12));
}

export function selectProgressiveRelationships(options: {
  graph: GraphData;
  edges: GraphEdge[];
  limit: number;
}): GraphEdge[] {
  const { graph, edges, limit } = options;
  if (!isFocalRelationshipGraph(graph, edges) || limit >= edges.length) return edges;

  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const grouped = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const neighborId = edge.source === graph.centerId ? edge.target : edge.source;
    grouped.set(neighborId, [...(grouped.get(neighborId) ?? []), edge]);
  }

  const primary = Array.from(grouped.entries()).map(([neighborId, relations]) => {
    const sorted = [...relations].sort((left, right) =>
      compareRelations(left, right, nodes, graph.centerId),
    );
    return { neighborId, edge: sorted[0], remainder: sorted.slice(1) };
  });
  const buckets = new Map<string, Array<(typeof primary)[number]>>();
  for (const item of primary) {
    const type = graphNodeTypeKey(nodes.get(item.neighborId)) || 'OTHER';
    buckets.set(type, [...(buckets.get(type) ?? []), item]);
  }
  for (const bucket of buckets.values()) {
    bucket.sort((left, right) => compareRelations(left.edge, right.edge, nodes, graph.centerId));
  }

  const ordered: GraphEdge[] = [];
  const types = [...buckets.keys()].sort((left, right) => left.localeCompare(right, 'es'));
  while (types.some((type) => buckets.get(type)?.length)) {
    for (const type of types) {
      const next = buckets.get(type)?.shift();
      if (next) ordered.push(next.edge);
    }
  }

  ordered.push(
    ...primary
      .flatMap((item) => item.remainder)
      .sort((left, right) => compareRelations(left, right, nodes, graph.centerId)),
  );
  return ordered.slice(0, limit);
}

function compareRelations(
  left: GraphEdge,
  right: GraphEdge,
  nodes: Map<string, GraphNode>,
  centerId: string,
): number {
  const leftNode = nodes.get(left.source === centerId ? left.target : left.source);
  const rightNode = nodes.get(right.source === centerId ? right.target : right.source);
  return (
    (RELATION_PRIORITY[right.relationType] ?? 50) - (RELATION_PRIORITY[left.relationType] ?? 50) ||
    (right.weight ?? 1) - (left.weight ?? 1) ||
    (rightNode?.degree ?? 0) - (leftNode?.degree ?? 0) ||
    left.relationType.localeCompare(right.relationType, 'es') ||
    left.id.localeCompare(right.id)
  );
}
