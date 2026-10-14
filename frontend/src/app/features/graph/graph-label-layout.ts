import { GraphRenderedEdge, GraphRenderedNode } from './graph.models';

interface GraphLabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface RankedVisibilityCandidate {
  id: string;
  priority: number;
  forced: boolean;
  box: GraphLabelBox;
}

const NODE_LABEL_HEIGHT = 34;
const EDGE_LABEL_HEIGHT = 16;

export function resolveNodeLabelOcclusion(options: {
  nodes: GraphRenderedNode[];
  requestedVisibility: Record<string, boolean>;
  centerId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  scale: number;
}): Record<string, boolean> {
  const candidates = options.nodes
    .filter((node) => options.requestedVisibility[node.node.id])
    .map((node) => {
      const isCenter = node.node.id === options.centerId;
      const isSelected = node.node.id === options.selectedNodeId;
      const isHovered = node.node.id === options.hoveredNodeId;

      return {
        id: node.node.id,
        priority:
          (isCenter ? 1000 : 0) +
          (isSelected ? 900 : 0) +
          (isHovered ? 820 : 0) +
          Math.min(node.node.degree ?? 0, 8) * 26,
        forced: isCenter || isSelected || isHovered,
        box: approximateNodeLabelBox(node),
      };
    });

  return cullRankedLabelBoxes(candidates, labelCollisionPadding(options.scale));
}

export function resolveEdgeLabelOcclusion(options: {
  edges: GraphRenderedEdge[];
  requestedVisibility: Record<string, boolean>;
  centerId: string | null;
  selectedNodeId: string | null;
  hoveredEdgeId: string | null;
  scale: number;
  occupiedBoxes?: GraphLabelBox[];
}): Record<string, boolean> {
  const candidates = options.edges
    .filter((edge) => options.requestedVisibility[edge.edge.id])
    .map((edge) => {
      const isHovered = edge.edge.id === options.hoveredEdgeId;
      const connectedToSelected =
        edge.edge.source === options.selectedNodeId || edge.edge.target === options.selectedNodeId;
      const connectedToCenter =
        edge.edge.source === options.centerId || edge.edge.target === options.centerId;

      return {
        id: edge.edge.id,
        priority:
          (isHovered ? 1000 : 0) +
          (connectedToSelected ? 760 : 0) +
          (connectedToCenter ? 560 : 0) +
          Math.round((edge.edge.weight ?? 1) * 42) +
          Math.round(edge.relationVisual.width * 24),
        forced: isHovered,
        box: approximateEdgeLabelBox(edge, options.scale),
      };
    });

  return cullRankedLabelBoxes(
    candidates,
    labelCollisionPadding(options.scale),
    options.occupiedBoxes ?? [],
  );
}

export function visibleLabelBoxes(options: {
  nodes: GraphRenderedNode[];
  nodeVisibility: Record<string, boolean>;
}): GraphLabelBox[] {
  return options.nodes
    .filter((node) => options.nodeVisibility[node.node.id])
    .map((node) => approximateNodeLabelBox(node));
}

function cullRankedLabelBoxes(
  candidates: RankedVisibilityCandidate[],
  padding: number,
  occupiedSeed: GraphLabelBox[] = [],
): Record<string, boolean> {
  if (!candidates.length) {
    return {};
  }

  const visible: Record<string, boolean> = {};
  const occupied = occupiedSeed.map((box) => expandBox(box, padding));
  const ranked = [...candidates].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );

  for (const candidate of ranked) {
    const expanded = expandBox(candidate.box, padding);
    if (!candidate.forced && occupied.some((box) => boxesIntersect(box, expanded))) {
      continue;
    }

    visible[candidate.id] = true;
    occupied.push(expanded);
  }

  return visible;
}

function approximateNodeLabelBox(node: GraphRenderedNode): GraphLabelBox {
  const offsetMatch = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(node.labelTransform);
  const offsetX = offsetMatch ? Number(offsetMatch[1]) : node.size + 18;
  const offsetY = offsetMatch ? Number(offsetMatch[2]) : 0;
  const scale = node.renderScale ?? 1;
  const anchorX = node.point.x + offsetX * scale;
  const anchorY = node.point.y + offsetY * scale;
  const width =
    Math.max(
      approximateTextWidth(node.titleLabel, 14, 0.62),
      approximateTextWidth(node.typeLabel, 10, 0.58),
    ) + 10;

  if (node.labelTextAnchor === 'middle')
    return {
      left: anchorX - (width * scale) / 2,
      right: anchorX + (width * scale) / 2,
      top: anchorY - 16 * scale,
      bottom: anchorY + (NODE_LABEL_HEIGHT - 16) * scale,
    };

  return node.labelTextAnchor === 'start'
    ? {
        left: anchorX - 2,
        right: anchorX + width * scale,
        top: anchorY - 16 * scale,
        bottom: anchorY + (NODE_LABEL_HEIGHT - 16) * scale,
      }
    : {
        left: anchorX - width * scale,
        right: anchorX + 2,
        top: anchorY - 16 * scale,
        bottom: anchorY + (NODE_LABEL_HEIGHT - 16) * scale,
      };
}

function approximateEdgeLabelBox(edge: GraphRenderedEdge, viewportScale: number): GraphLabelBox {
  const scale = 1 / Math.max(viewportScale, 0.1);
  const width = (approximateTextWidth(edge.displayLabel, 10.5, 0.6) + 12) * scale;
  return {
    left: edge.labelPoint.x - width / 2,
    right: edge.labelPoint.x + width / 2,
    top: edge.labelPoint.y - (EDGE_LABEL_HEIGHT * scale) / 2,
    bottom: edge.labelPoint.y + (EDGE_LABEL_HEIGHT * scale) / 2,
  };
}

function approximateTextWidth(text: string, fontSize: number, factor: number): number {
  return Math.max(16, text.length * fontSize * factor);
}

function labelCollisionPadding(scale: number): number {
  if (scale >= 1.35) {
    return 4;
  }
  if (scale >= 1.1) {
    return 6;
  }
  return 8;
}

function expandBox(box: GraphLabelBox, padding: number): GraphLabelBox {
  return {
    left: box.left - padding,
    top: box.top - padding,
    right: box.right + padding,
    bottom: box.bottom + padding,
  };
}

function boxesIntersect(left: GraphLabelBox, right: GraphLabelBox): boolean {
  return !(
    left.right < right.left ||
    left.left > right.right ||
    left.bottom < right.top ||
    left.top > right.bottom
  );
}
