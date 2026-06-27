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

export interface ForceLayoutScratch {
  nodeIds: string[];
  forces: Record<string, GraphPoint>;
  anchors: Record<string, GraphPoint>;
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
  const adjacency = buildAdjacency(graph);
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const placedNodeIds = new Set<string>([graph.centerId]);
  const centerNeighbors = [...(adjacency.get(graph.centerId) ?? [])]
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is GraphData['nodes'][number] => !!node)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'es'));

  centerNeighbors.forEach((node, index) => {
    const angle = (index / Math.max(centerNeighbors.length, 1)) * TWO_PI - Math.PI / 2;
    const radius = 250 + (index % 2) * 26;

    positions[node.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
    placedNodeIds.add(node.id);
  });

  centerNeighbors.forEach((hubNode, hubIndex) => {
    const hubPoint = positions[hubNode.id];
    if (!hubPoint) {
      return;
    }

    const secondRing = [...(adjacency.get(hubNode.id) ?? [])]
      .filter((nodeId) => nodeId !== graph.centerId && !placedNodeIds.has(nodeId))
      .map((nodeId) => nodeMap.get(nodeId))
      .filter((node): node is GraphData['nodes'][number] => !!node)
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'es'));

    const parentAngle = Math.atan2(hubPoint.y, hubPoint.x);
    const spread = Math.min(Math.PI * 1.2, 0.7 + secondRing.length * 0.22);
    const startAngle = parentAngle - spread / 2;

    secondRing.forEach((node, index) => {
      const ratio = secondRing.length <= 1 ? 0.5 : index / (secondRing.length - 1);
      const angle = startAngle + spread * ratio;
      const radius = 148 + Math.floor(index / 5) * 44 + (hubIndex % 2) * 10;

      positions[node.id] = {
        x: hubPoint.x + Math.cos(angle) * radius,
        y: hubPoint.y + Math.sin(angle) * radius,
      };
      placedNodeIds.add(node.id);
    });
  });

  const nodes = graph.nodes
    .filter((node) => !placedNodeIds.has(node.id))
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'es'));

  nodes.forEach((node, index) => {
    const ring = Math.floor(index / 10);
    const ringIndex = index % 10;
    const itemsInRing = Math.min(10, nodes.length - ring * 10);
    const angle = (ringIndex / Math.max(itemsInRing, 1)) * TWO_PI - Math.PI / 2;
    const radius = 560 + ring * 170 + (ringIndex % 2) * 26;

    positions[node.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  return positions;
}

export function createForceLayoutScratch(
  graph: GraphData,
  anchors: Record<string, GraphPoint> = {},
): ForceLayoutScratch {
  const nodeIds = graph.nodes.map((node) => node.id);
  const forces = nodeIds.reduce<Record<string, GraphPoint>>((acc, nodeId) => {
    acc[nodeId] = { x: 0, y: 0 };
    return acc;
  }, {});

  return { nodeIds, forces, anchors };
}

export function stepForceLayout(
  graph: GraphData,
  positions: Record<string, GraphPoint>,
  velocities: Record<string, GraphPoint>,
  draggingNodeId: string | null,
  scratch?: ForceLayoutScratch,
): number {
  const profile = resolveGraphLayoutProfile(graph);

  const nodeIds = scratch?.nodeIds ?? graph.nodes.map((node) => node.id);
  const forces = scratch?.forces ?? {};
  const anchors = scratch?.anchors ?? {};

  for (let index = 0; index < nodeIds.length; index += 1) {
    const id = nodeIds[index];
    const force = (forces[id] ??= { x: 0, y: 0 });

    force.x = 0;
    force.y = 0;
    velocities[id] ??= { x: 0, y: 0 };
    positions[id] ??= { x: 0, y: 0 };
  }

  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      const a = nodeIds[i];
      const b = nodeIds[j];
      const dx = positions[b].x - positions[a].x;
      const dy = positions[b].y - positions[a].y;
      const distSq = Math.max(dx * dx + dy * dy, 1);
      const dist = Math.sqrt(distSq);
      const force = profile.repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces[a].x -= fx;
      forces[a].y -= fy;
      forces[b].x += fx;
      forces[b].y += fy;
    }
  }

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex];
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (!source || !target) {
      continue;
    }

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const stretch = dist - profile.springLength;
    const strength = profile.springStrength * Math.max(0.8, edge.weight);
    const fx = (dx / dist) * stretch * strength;
    const fy = (dy / dist) * stretch * strength;

    forces[edge.source].x += fx;
    forces[edge.source].y += fy;
    forces[edge.target].x -= fx;
    forces[edge.target].y -= fy;
  }

  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
    const node = graph.nodes[nodeIndex];
    const point = positions[node.id];
    if (!point) {
      continue;
    }

    const targetX = node.id === graph.centerId ? 0 : point.x * 0.08;
    const targetY = node.id === graph.centerId ? 0 : point.y * 0.08;
    forces[node.id].x -= targetX * profile.centeringStrength;
    forces[node.id].y -= targetY * profile.centeringStrength;

    const anchor = anchors[node.id];
    if (anchor && node.id !== graph.centerId) {
      forces[node.id].x += (anchor.x - point.x) * profile.anchorStrength;
      forces[node.id].y += (anchor.y - point.y) * profile.anchorStrength;
    }
  }

  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
    const node = graph.nodes[nodeIndex];
    if (node.id === graph.centerId) {
      const centerVelocity = (velocities[node.id] ??= { x: 0, y: 0 });
      const centerPosition = (positions[node.id] ??= { x: 0, y: 0 });
      centerVelocity.x = 0;
      centerVelocity.y = 0;
      centerPosition.x = 0;
      centerPosition.y = 0;
      continue;
    }

    if (node.id === draggingNodeId) {
      const draggedVelocity = (velocities[node.id] ??= { x: 0, y: 0 });
      draggedVelocity.x = 0;
      draggedVelocity.y = 0;
      continue;
    }

    const velocity = velocities[node.id];
    velocity.x = (velocity.x + forces[node.id].x) * profile.damping;
    velocity.y = (velocity.y + forces[node.id].y) * profile.damping;

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > profile.maxSpeed) {
      velocity.x = (velocity.x / speed) * profile.maxSpeed;
      velocity.y = (velocity.y / speed) * profile.maxSpeed;
    }

    positions[node.id].x += velocity.x;
    positions[node.id].y += velocity.y;
  }

  const centerVelocity = (velocities[graph.centerId] ??= { x: 0, y: 0 });
  const centerPosition = (positions[graph.centerId] ??= { x: 0, y: 0 });
  centerVelocity.x = 0;
  centerVelocity.y = 0;
  centerPosition.x = 0;
  centerPosition.y = 0;

  let totalMotion = 0;
  for (const nodeId of nodeIds) {
    if (nodeId === graph.centerId || nodeId === draggingNodeId) {
      continue;
    }

    const velocity = velocities[nodeId];
    totalMotion += Math.abs(velocity.x) + Math.abs(velocity.y);
  }

  return totalMotion;
}

export function applyAmbientGraphDrift(options: {
  graph: GraphData;
  positions: Record<string, GraphPoint>;
  layoutScratch?: ForceLayoutScratch;
  timestampMs: number;
}): void {
  const anchors = options.layoutScratch?.anchors ?? {};
  const time = options.timestampMs / 1000;

  for (const node of options.graph.nodes) {
    if (node.id === options.graph.centerId) {
      options.positions[node.id] = { x: 0, y: 0 };
      continue;
    }

    const anchor = anchors[node.id] ?? options.positions[node.id];
    if (!anchor) {
      continue;
    }

    const seed = hashGraphNodeId(node.id);
    const amplitude = node.id.startsWith('workspace-type-')
      ? 4.5
      : Math.max(2.8, 6.2 - Math.min(node.degree ?? 0, 6) * 0.42);
    const speed = 0.22 + (seed % 7) * 0.018;
    const offsetX = Math.sin(time * speed + seed * 0.13) * amplitude;
    const offsetY = Math.cos(time * (speed * 0.92) + seed * 0.17) * amplitude * 0.82;

    options.positions[node.id] = {
      x: anchor.x + offsetX,
      y: anchor.y + offsetY,
    };
  }
}

function buildAdjacency(graph: GraphData): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, new Set<string>());
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  return adjacency;
}

function resolveGraphLayoutProfile(graph: GraphData): {
  repulsion: number;
  springLength: number;
  springStrength: number;
  centeringStrength: number;
  anchorStrength: number;
  damping: number;
  maxSpeed: number;
} {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  if (nodeCount >= 60 || edgeCount >= 120) {
    return {
      repulsion: 24000,
      springLength: 150,
      springStrength: 0.0024,
      centeringStrength: 0.0032,
      anchorStrength: 0.0085,
      damping: 0.76,
      maxSpeed: 5.2,
    };
  }

  if (nodeCount >= 34 || edgeCount >= 52) {
    return {
      repulsion: 34000,
      springLength: 162,
      springStrength: 0.0021,
      centeringStrength: 0.0028,
      anchorStrength: 0.0062,
      damping: 0.79,
      maxSpeed: 6.2,
    };
  }

  return {
    repulsion: 54000,
    springLength: 180,
    springStrength: 0.0018,
    centeringStrength: 0.0022,
    anchorStrength: 0.0034,
    damping: 0.84,
    maxSpeed: 8,
  };
}

function hashGraphNodeId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
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

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
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
