import { getRelationTypeConfig } from './graph.config';
import { GraphData, GraphEdge, GraphPoint } from './graph.models';

const TWO_PI = Math.PI * 2;

export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function buildGraphData(raw: GraphData): GraphData {
  return raw;
}

export function normalizeGraphData(input: {
  centerId: string;
  nodes: GraphData['nodes'];
  edges: GraphData['edges'];
  entityTypes: string[];
  relationTypes: string[];
}): GraphData {
  const degrees = new Map<string, number>();

  for (const node of input.nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of input.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  const pairCounts = new Map<string, number>();
  const pairCursor = new Map<string, number>();

  for (const edge of input.edges) {
    const pairKey = [edge.source, edge.target].sort().join('::');
    pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
  }

  const nodes = input.nodes.map((node) => ({
    ...node,
    degree: degrees.get(node.id) ?? 0,
  }));

  const edges: GraphEdge[] = input.edges.map((edge) => {
    const pairKey = [edge.source, edge.target].sort().join('::');
    const nextIndex = pairCursor.get(pairKey) ?? 0;
    pairCursor.set(pairKey, nextIndex + 1);

    const relationConfig = getRelationTypeConfig(edge.relationType);

    return {
      ...edge,
      label: edge.label || relationConfig.label,
      directed: edge.directed ?? relationConfig.directed,
      weight: edge.weight ?? 1,
      parallelIndex: nextIndex,
      parallelTotal: pairCounts.get(pairKey) ?? 1,
    };
  });

  return {
    centerId: input.centerId,
    nodes,
    edges,
    entityTypes: [...input.entityTypes].sort(),
    relationTypes: [...input.relationTypes].sort(),
  };
}

export function createInitialPositions(graph: GraphData): Record<string, GraphPoint> {
  const center: GraphPoint = { x: 0, y: 0 };
  const positions: Record<string, GraphPoint> = {
    [graph.centerId]: center,
  };

  const nodes = graph.nodes
    .filter((node) => node.id !== graph.centerId)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'es'));

  nodes.forEach((node, index) => {
    const ring = Math.floor(index / 8);
    const ringIndex = index % 8;
    const itemsInRing = Math.min(8, nodes.length - ring * 8);
    const angle = (ringIndex / Math.max(itemsInRing, 1)) * TWO_PI - Math.PI / 2;
    const radius = 260 + ring * 150 + (ringIndex % 2) * 22;

    positions[node.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  return positions;
}

export function stepForceLayout(
  graph: GraphData,
  positions: Record<string, GraphPoint>,
  velocities: Record<string, GraphPoint>,
  draggingNodeId: string | null,
): void {
  const repulsion = 54000;
  const springLength = 180;
  const springStrength = 0.0018;
  const centeringStrength = 0.0022;
  const damping = 0.84;
  const maxSpeed = 8;

  const nodeIds = graph.nodes.map((node) => node.id);
  const forces: Record<string, GraphPoint> = {};

  nodeIds.forEach((id) => {
    forces[id] = { x: 0, y: 0 };
    velocities[id] ??= { x: 0, y: 0 };
    positions[id] ??= { x: 0, y: 0 };
  });

  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      const a = nodeIds[i];
      const b = nodeIds[j];
      const dx = positions[b].x - positions[a].x;
      const dy = positions[b].y - positions[a].y;
      const distSq = Math.max(dx * dx + dy * dy, 1);
      const dist = Math.sqrt(distSq);
      const force = repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces[a].x -= fx;
      forces[a].y -= fy;
      forces[b].x += fx;
      forces[b].y += fy;
    }
  }

  graph.edges.forEach((edge) => {
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (!source || !target) {
      return;
    }

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const stretch = dist - springLength;
    const strength = springStrength * Math.max(0.8, edge.weight);
    const fx = (dx / dist) * stretch * strength;
    const fy = (dy / dist) * stretch * strength;

    forces[edge.source].x += fx;
    forces[edge.source].y += fy;
    forces[edge.target].x -= fx;
    forces[edge.target].y -= fy;
  });

  graph.nodes.forEach((node) => {
    const point = positions[node.id];
    if (!point) {
      return;
    }

    const target = node.id === graph.centerId ? { x: 0, y: 0 } : { x: point.x * 0.08, y: point.y * 0.08 };
    forces[node.id].x -= target.x * centeringStrength;
    forces[node.id].y -= target.y * centeringStrength;
  });

  graph.nodes.forEach((node) => {
    if (node.id === graph.centerId) {
      velocities[node.id] = { x: 0, y: 0 };
      positions[node.id] = { x: 0, y: 0 };
      return;
    }

    if (node.id === draggingNodeId) {
      velocities[node.id] = { x: 0, y: 0 };
      return;
    }

    const velocity = velocities[node.id];
    velocity.x = (velocity.x + forces[node.id].x) * damping;
    velocity.y = (velocity.y + forces[node.id].y) * damping;

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > maxSpeed) {
      velocity.x = (velocity.x / speed) * maxSpeed;
      velocity.y = (velocity.y / speed) * maxSpeed;
    }

    positions[node.id].x += velocity.x;
    positions[node.id].y += velocity.y;
  });

  velocities[graph.centerId] = { x: 0, y: 0 };
  positions[graph.centerId] = { x: 0, y: 0 };
}

export function edgeCurveOffset(edge: GraphEdge): number {
  if (edge.parallelTotal <= 1) {
    return 0;
  }

  const center = (edge.parallelTotal - 1) / 2;
  return (edge.parallelIndex - center) * 28;
}

export function edgeMidpoint(a: GraphPoint, b: GraphPoint, curveOffset = 0): GraphPoint {
  const control = edgeControlPoint(a, b, curveOffset);

  return {
    x: 0.25 * a.x + 0.5 * control.x + 0.25 * b.x,
    y: 0.25 * a.y + 0.5 * control.y + 0.25 * b.y,
  };
}

export function edgeControlPoint(a: GraphPoint, b: GraphPoint, curveOffset = 0): GraphPoint {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;

  return {
    x: midX + normalX * curveOffset,
    y: midY + normalY * curveOffset,
  };
}

export function edgePath(a: GraphPoint, b: GraphPoint, curveOffset = 0): string {
  if (!curveOffset) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  const control = edgeControlPoint(a, b, curveOffset);
  return `M ${a.x} ${a.y} Q ${control.x} ${control.y} ${b.x} ${b.y}`;
}

export function measureGraphBounds(
  nodeIds: string[],
  positions: Record<string, GraphPoint>,
  radiusForNode: (nodeId: string) => number,
): GraphBounds | null {
  if (!nodeIds.length) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const nodeId of nodeIds) {
    const point = positions[nodeId];
    if (!point) {
      continue;
    }

    const radius = radiusForNode(nodeId);
    minX = Math.min(minX, point.x - radius);
    minY = Math.min(minY, point.y - radius);
    maxX = Math.max(maxX, point.x + radius);
    maxY = Math.max(maxY, point.y + radius);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
