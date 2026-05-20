import {
  getEntityTypeConfig,
  getRelationTypeConfig,
  graphNodeShapePath,
  lineDasharray,
} from './graph.config';
import { compactGraphLabel } from './graph-labels';
import { edgeCurveOffset, edgeMidpoint, edgePath } from './graph-layout';
import {
  GraphEdge,
  GraphNode,
  GraphPoint,
  GraphRenderedEdge,
  GraphRenderedNode,
  GraphTooltip,
  GraphTypeMeta,
} from './graph.models';

export function graphImageBackdrop(imageUrl: string | null): string | null {
  return imageUrl ? `url("${imageUrl}")` : null;
}

export function graphEdgeMarkerId(type: string): string {
  return `graph-arrow-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function graphNodeSize(node: GraphNode, centerId: string | null, selectedNodeId: string | null): number {
  const base = node.id === centerId ? 28 : 22;
  const degreeBoost = Math.min(node.degree ?? 0, 5) * 1.25;
  const selectedBoost = selectedNodeId === node.id ? 6 : 0;
  return base + degreeBoost + selectedBoost;
}

export function graphNodeHaloSize(node: GraphNode, centerId: string | null, selectedNodeId: string | null): number {
  return graphNodeSize(node, centerId, selectedNodeId) + 12;
}

export function buildRenderedGraphEdges(options: {
  edges: GraphEdge[];
  positions: Record<string, GraphPoint>;
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
    ? options.positions[options.centerId] ?? { x: 0, y: 0 }
    : { x: 0, y: 0 };

  return options.nodes.map((node) => {
    const point = options.positions[node.id] ?? { x: 0, y: 0 };
    const nodeVisual = getEntityTypeConfig(node.type);
    const size = graphNodeSize(node, options.centerId, options.selectedNodeId);
    const labelDirection = node.id === options.centerId || point.x >= centerPoint.x ? 1 : -1;
    const isPrimaryLabel = node.id === options.centerId || options.selectedNodeId === node.id;

    return {
      node,
      point,
      transform: `translate(${point.x} ${point.y})`,
      selected: options.selectedNodeId === node.id,
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
      typeLabel: getEntityTypeConfig(node.type).label,
    };
  });
}

export function buildGraphTypeMeta(types: string[], kind: 'entity' | 'relation'): Record<string, GraphTypeMeta> {
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

  const config = getEntityTypeConfig(node.type);
  return { label: config.label, color: config.color };
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
