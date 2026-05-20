import { measureGraphBounds } from './graph-layout';
import { createCenteredGraphViewport } from './graph-camera';
import { createGraphViewport, fitGraphBounds } from './graph-viewport';
import { GraphData, GraphPoint, GraphViewport } from './graph.models';

export function createGraphNodePosition(
  positions: Record<string, GraphPoint>,
  nodeId: string,
): GraphPoint {
  return positions[nodeId] ?? { x: 0, y: 0 };
}

export function createGraphFocusedViewport(options: {
  graph: GraphData | null;
  size: { width: number; height: number };
  positions: Record<string, GraphPoint>;
  filteredNodeIds: string[];
  haloSizeForNode: (nodeId: string) => number;
}): GraphViewport | null {
  const { graph, size, positions, filteredNodeIds, haloSizeForNode } = options;
  if (!graph || !size.width || !size.height) {
    return null;
  }

  const bounds = measureGraphBounds(filteredNodeIds, positions, (nodeId) => haloSizeForNode(nodeId) + 56);
  const fitted = bounds ? fitGraphBounds(bounds, size, 108) : createGraphViewport(size.width, size.height, 0.82);
  const centerPoint = positions[graph.centerId] ?? { x: 0, y: 0 };

  return createCenteredGraphViewport(centerPoint, size, fitted.scale);
}

export function createGraphViewportFromPoint(
  point: GraphPoint,
  size: { width: number; height: number },
  scale: number,
): GraphViewport | null {
  return createCenteredGraphViewport(point, size, scale);
}
