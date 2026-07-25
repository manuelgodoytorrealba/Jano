import {
  getEntityTypeConfig,
  getRelationTypeConfig,
  graphNodeShapePath,
  lineDasharray,
} from './graph.config';
import { compactGraphLabel } from './graph-labels';
import { edgeCurveOffset, edgeMidpoint, edgePath } from './graph-layout';
import {
  GraphAmbientField,
  GraphEdge,
  GraphNode,
  GraphPoint,
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphTooltip,
  GraphTypeMeta,
  graphNodeTypeKey,
} from './graph.models';

export function graphImageBackdrop(imageUrl: string | null): string | null {
  return imageUrl ? `url("${imageUrl}")` : null;
}

export function graphEdgeMarkerId(type: string): string {
  return `graph-arrow-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function graphNodeSize(
  node: GraphNode,
  centerId: string | null,
  selectedNodeId: string | null,
): number {
  const base = node.id === centerId ? 28 : isWorkspaceTypeHub(node.id) ? 26 : 22;
  const degreeBoost = Math.min(node.degree ?? 0, 5) * 1.25;
  const selectedBoost = selectedNodeId === node.id ? 6 : 0;
  return base + degreeBoost + selectedBoost;
}

export function graphNodeHaloSize(
  node: GraphNode,
  centerId: string | null,
  selectedNodeId: string | null,
): number {
  return graphNodeSize(node, centerId, selectedNodeId) + 12;
}

export function buildRenderedGraphEdges(options: {
  edges: GraphEdge[];
  positions: Record<string, GraphPoint>;
  centerId: string | null;
  selectedNodeId: string | null;
}): GraphRenderedEdge[] {
  return options.edges.map((edge) => {
    const source = options.positions[edge.source] ?? { x: 0, y: 0 };
    const target = options.positions[edge.target] ?? { x: 0, y: 0 };
    const relationVisual = getRelationTypeConfig(edge.relationType);
    const curve = edgeCurveOffset(edge);
    const path = edgePath(source, target, curve);

    return {
      edge,
      path,
      labelPoint: edgeMidpoint(source, target, curve),
      depthTier: resolveEdgeDepthTier(edge, options.centerId, options.selectedNodeId),
      muted:
        !!options.selectedNodeId &&
        edge.source !== options.selectedNodeId &&
        edge.target !== options.selectedNodeId,
      relationVisual,
      markerId: graphEdgeMarkerId(edge.relationType),
      dasharray: lineDasharray(relationVisual.style),
      displayLabel: compactGraphLabel(edge.label, 28),
    };
  });
}

export function buildRenderedGraphNodes(options: {
  nodes: GraphNode[];
  positions: Record<string, GraphPoint>;
  centerId: string | null;
  selectedNodeId: string | null;
  selectedNeighbors: Set<string>;
}): GraphRenderedNode[] {
  const centerPoint = options.centerId
    ? (options.positions[options.centerId] ?? { x: 0, y: 0 })
    : { x: 0, y: 0 };

  return options.nodes.map((node) => {
    const point = options.positions[node.id] ?? { x: 0, y: 0 };
    const nodeVisual = getEntityTypeConfig(graphNodeTypeKey(node));
    const size = graphNodeSize(node, options.centerId, options.selectedNodeId);
    const labelDirection = node.id === options.centerId || point.x >= centerPoint.x ? 1 : -1;
    const isPrimaryLabel = node.id === options.centerId || options.selectedNodeId === node.id;

    return {
      node,
      point,
      transform: `translate(${point.x} ${point.y})`,
      selected: options.selectedNodeId === node.id,
      depthTier: resolveNodeDepthTier(
        node,
        point,
        centerPoint,
        options.centerId,
        options.selectedNodeId,
        options.selectedNeighbors,
      ),
      muted:
        !!options.selectedNodeId &&
        options.selectedNodeId !== node.id &&
        !options.selectedNeighbors.has(node.id),
      size,
      haloSize: size + 12,
      shapePath: graphNodeShapePath(nodeVisual.shape, size),
      labelTransform: `translate(${labelDirection * (size + 18)} 0)`,
      labelTextAnchor: labelDirection === 1 ? 'start' : 'end',
      nodeVisual,
      titleLabel: compactGraphLabel(node.label, isPrimaryLabel ? 34 : 30),
      typeLabel: getEntityTypeConfig(graphNodeTypeKey(node)).label,
    };
  });
}

export function buildGraphTypeMeta(
  types: string[],
  kind: 'entity' | 'relation',
): Record<string, GraphTypeMeta> {
  return types.reduce<Record<string, GraphTypeMeta>>((acc, type) => {
    const config = kind === 'entity' ? getEntityTypeConfig(type) : getRelationTypeConfig(type);
    acc[type] = { label: config.label, color: config.color };
    return acc;
  }, {});
}

export function contextualGraphTypeMeta(node: GraphNode | null): GraphTypeMeta | null {
  if (!node) {
    return null;
  }

  const config = getEntityTypeConfig(graphNodeTypeKey(node));
  return { label: config.label, color: config.color };
}

export function buildGraphAmbientFields(options: {
  nodes: GraphNode[];
  positions: Record<string, GraphPoint>;
  centerId: string | null;
  selectedNodeId: string | null;
  selectedNeighbors: Set<string>;
}): GraphAmbientField[] {
  const groups = new Map<
    string,
    { nodes: GraphNode[]; totalWeight: number; weightX: number; weightY: number }
  >();

  for (const node of options.nodes) {
    if (node.id === options.centerId) {
      continue;
    }

    const point = options.positions[node.id];
    if (!point) {
      continue;
    }

    const weight = 1 + Math.min(node.degree ?? 0, 6) * 0.35;
    const type = graphNodeTypeKey(node);
    const bucket = groups.get(type) ?? { nodes: [], totalWeight: 0, weightX: 0, weightY: 0 };
    bucket.nodes.push(node);
    bucket.totalWeight += weight;
    bucket.weightX += point.x * weight;
    bucket.weightY += point.y * weight;
    groups.set(type, bucket);
  }

  return Array.from(groups.entries())
    .map(([type, group]) => {
      if (group.nodes.length < 2) {
        return null;
      }

      const config = getEntityTypeConfig(type);
      const x = group.weightX / Math.max(group.totalWeight, 1);
      const y = group.weightY / Math.max(group.totalWeight, 1);
      const spread =
        group.nodes.reduce((sum, node) => {
          const point = options.positions[node.id] ?? { x: 0, y: 0 };
          return sum + Math.hypot(point.x - x, point.y - y);
        }, 0) / Math.max(group.nodes.length, 1);

      const includesSelected = group.nodes.some((node) => node.id === options.selectedNodeId);
      const includesNeighbor = group.nodes.some((node) => options.selectedNeighbors.has(node.id));
      const emphasis = includesSelected
        ? 'focus'
        : includesNeighbor || group.nodes.length >= 4
          ? 'mid'
          : 'far';

      return {
        id: `field-${type.toLowerCase()}`,
        x,
        y,
        radius: Math.max(120, Math.min(280, spread * 1.18 + 86)),
        color: config.color,
        opacity: includesSelected ? 0.16 : includesNeighbor ? 0.11 : 0.08,
        emphasis,
        priority:
          group.nodes.length * 80 +
          group.totalWeight * 40 +
          (includesSelected ? 400 : 0) +
          (includesNeighbor ? 180 : 0),
      };
    })
    .filter((field): field is GraphAmbientField & { priority: number } => !!field)
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3)
    .map(({ priority: _priority, ...field }) => field);
}

export function graphTooltipStyle(
  tooltip: GraphTooltip | null,
  host: HTMLElement | null | undefined,
): Record<string, string> {
  if (!tooltip || !host) {
    return {};
  }

  const rect = host.getBoundingClientRect();
  return {
    left: `${tooltip.x - rect.left + 18}px`,
    top: `${tooltip.y - rect.top + 18}px`,
  };
}

function resolveNodeDepthTier(
  node: GraphNode,
  point: GraphPoint,
  centerPoint: GraphPoint,
  centerId: string | null,
  selectedNodeId: string | null,
  selectedNeighbors: Set<string>,
): 'focus' | 'mid' | 'far' {
  if (node.id === centerId || node.id === selectedNodeId) {
    return 'focus';
  }

  if (isWorkspaceTypeHub(node.id)) {
    return selectedNodeId ? 'mid' : 'focus';
  }

  if (selectedNodeId) {
    return selectedNeighbors.has(node.id) ? 'mid' : 'far';
  }

  const distance = Math.hypot(point.x - centerPoint.x, point.y - centerPoint.y);
  if (distance <= 280 || (node.degree ?? 0) >= 4) {
    return 'mid';
  }

  return 'far';
}

function isWorkspaceTypeHub(nodeId: string): boolean {
  return nodeId.startsWith('workspace-type-');
}

function resolveEdgeDepthTier(
  edge: GraphEdge,
  centerId: string | null,
  selectedNodeId: string | null,
): 'focus' | 'mid' | 'far' {
  if (
    edge.source === selectedNodeId ||
    edge.target === selectedNodeId ||
    edge.source === centerId ||
    edge.target === centerId
  ) {
    return selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)
      ? 'focus'
      : 'mid';
  }

  return 'far';
}
