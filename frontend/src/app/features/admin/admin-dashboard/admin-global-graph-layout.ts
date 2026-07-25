import { GraphResponseDto } from '../../../core/api/graph.models';
import { graphNodeTypeKey, GraphPoint } from '../../graph/graph.models';

const FULL_CIRCLE = Math.PI * 2;

export interface AdminGlobalGraphLayout {
  positions: Record<string, GraphPoint>;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function createAdminGlobalGraphLayout(graph: GraphResponseDto): AdminGlobalGraphLayout {
  const positions: Record<string, GraphPoint> = { [graph.centerId]: { x: 0, y: 0 } };
  const entities = graph.nodes.filter((node) => !node.id.startsWith('workspace-'));
  const groups = new Map<string, typeof entities>();

  for (const node of entities) {
    const group = groups.get(graphNodeTypeKey(node)) ?? [];
    group.push(node);
    groups.set(graphNodeTypeKey(node), group);
  }

  const types = [...groups.keys()].sort();
  const orbit = Math.max(300, 170 + Math.sqrt(entities.length) * 42);
  const sectorSize = FULL_CIRCLE / Math.max(types.length, 1);

  types.forEach((type, typeIndex) => {
    const angle = typeIndex * sectorSize - Math.PI / 2;
    const anchor = { x: Math.cos(angle) * orbit * 0.38, y: Math.sin(angle) * orbit * 0.38 };
    const hubId = `workspace-kind-${type}`;
    positions[hubId] = anchor;

    [...(groups.get(type) ?? [])]
      .sort((left, right) => left.id.localeCompare(right.id))
      .forEach((node, index) => {
        const count = groups.get(type)?.length ?? 1;
        const localAngle = angle + ((index + 0.5) / count - 0.5) * sectorSize * 0.76;
        const radius = orbit * (0.62 + (index % 3) * 0.15);
        positions[node.id] = {
          x: Math.cos(localAngle) * radius,
          y: Math.sin(localAngle) * radius,
        };
      });
  });

  graph.nodes.forEach((node, index) => {
    positions[node.id] ??= {
      x: Math.cos(index * FULL_CIRCLE * 0.618) * orbit,
      y: Math.sin(index * FULL_CIRCLE * 0.618) * orbit,
    };
  });

  const points = Object.values(positions);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    positions,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
