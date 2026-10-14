import { GraphResponseDto } from '../../core/api/graph.models';
import { GraphData, GraphPoint } from './graph.models';
import { toGraphData } from './graph-setup';

export function mergeExplorationGraph(graph: GraphData, response: GraphResponseDto): GraphData {
  return toGraphData({
    centerId: graph.centerId,
    nodes: [
      ...new Map([...graph.nodes, ...response.nodes].map((node) => [node.id, node])).values(),
    ],
    edges: [
      ...new Map([...graph.edges, ...response.edges].map((edge) => [edge.id, edge])).values(),
    ],
  });
}

export function explorationNeighbors(graph: GraphData, nodeId: string): string[] {
  return [
    ...new Set(
      graph.edges.flatMap((edge) =>
        edge.source === nodeId ? [edge.target] : edge.target === nodeId ? [edge.source] : [],
      ),
    ),
  ];
}

export function seedMobileExploration(
  ids: string[],
  width: number,
  height: number,
): Record<string, GraphPoint> {
  const offsets = [
    [-0.3, -0.23],
    [0.3, -0.23],
    [-0.3, 0.24],
    [0.3, 0.24],
    [0, 0.45],
  ];
  return Object.fromEntries(
    ids.map((id, index) => [
      id,
      {
        x: (offsets[index]?.[0] ?? 0) * width,
        y: (offsets[index]?.[1] ?? 0.45) * height,
      },
    ]),
  );
}

export function placeExplorationNodes(
  ids: string[],
  parent: GraphPoint,
  positions: Record<string, GraphPoint>,
  visibleIds: ReadonlySet<string>,
): Record<string, GraphPoint> {
  const result = { ...positions };
  const occupied = [...visibleIds].map((id) => positions[id]).filter(Boolean);
  for (const id of ids) {
    let point = parent;
    for (let slot = 0; slot < 160; slot++) {
      const radius = 170 + Math.floor(slot / 12) * 130;
      const angle = ((slot % 12) * Math.PI) / 6;
      point = { x: parent.x + Math.cos(angle) * radius, y: parent.y + Math.sin(angle) * radius };
      if (!occupied.some((p) => Math.abs(p.x - point.x) < 150 && Math.abs(p.y - point.y) < 125))
        break;
    }
    result[id] = point;
    occupied.push(point);
  }
  return result;
}
