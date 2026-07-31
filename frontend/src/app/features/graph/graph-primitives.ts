export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphLayoutNode {
  id: string;
}

export function createCircularGraphLayout(
  nodes: GraphLayoutNode[],
  radius = 180,
): Record<string, GraphPoint> {
  if (!nodes.length) return {};

  return [...nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .reduce<Record<string, GraphPoint>>((positions, node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
      positions[node.id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      return positions;
    }, {});
}

export function createLinePath(from: GraphPoint, to: GraphPoint): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
