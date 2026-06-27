import { GraphPoint, GraphTooltip } from './graph.models';

export type GraphStageRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export type GraphPointerSession =
  | {
      kind: 'graph-pan';
      pointerId: number;
      originClient: GraphPoint;
      lastClient: GraphPoint;
      moved: boolean;
    }
  | {
      kind: 'node-drag';
      pointerId: number;
      nodeId: string;
      originClient: GraphPoint;
      pointerOffset: GraphPoint;
      stageRect: GraphStageRect;
      moved: boolean;
    }
  | {
      kind: 'image-pan';
      pointerId: number;
      originClient: GraphPoint;
      lastClient: GraphPoint;
      moved: boolean;
    };

export const GRAPH_DRAG_THRESHOLD = 6;

export function exceedsPointerThreshold(
  origin: GraphPoint,
  current: GraphPoint,
  threshold = GRAPH_DRAG_THRESHOLD,
): boolean {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  return Math.sqrt(dx * dx + dy * dy) >= threshold;
}

export function clearPointerCapture(target: EventTarget | null, pointerId: number | null): void {
  if (pointerId === null) {
    return;
  }

  const element = target as Element | null;
  if (element?.hasPointerCapture?.(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

export function shouldSuppressHover(session: GraphPointerSession | null): boolean {
  return !!session;
}

export function currentDraggedNodeId(session: GraphPointerSession | null): string | null {
  return session?.kind === 'node-drag' ? session.nodeId : null;
}

export function createGraphPanSession(pointerId: number, client: GraphPoint): GraphPointerSession {
  return {
    kind: 'graph-pan',
    pointerId,
    originClient: client,
    lastClient: client,
    moved: false,
  };
}

export function updateGraphPanSession(
  session: Extract<GraphPointerSession, { kind: 'graph-pan' }>,
  client: GraphPoint,
): {
  moved: boolean;
  deltaX: number;
  deltaY: number;
  nextSession: Extract<GraphPointerSession, { kind: 'graph-pan' }>;
} {
  const deltaX = client.x - session.lastClient.x;
  const deltaY = client.y - session.lastClient.y;
  const moved = session.moved || exceedsPointerThreshold(session.originClient, client);

  return {
    moved,
    deltaX,
    deltaY,
    nextSession: {
      ...session,
      lastClient: client,
      moved,
    },
  };
}

export function createNodeDragSession(
  pointerId: number,
  nodeId: string,
  client: GraphPoint,
  pointerOffset: GraphPoint,
  stageRect: GraphStageRect,
): GraphPointerSession {
  return {
    kind: 'node-drag',
    pointerId,
    nodeId,
    originClient: client,
    pointerOffset,
    stageRect,
    moved: false,
  };
}

export function didNodeDragMove(
  session: Extract<GraphPointerSession, { kind: 'node-drag' }>,
  client: GraphPoint,
): boolean {
  return session.moved || exceedsPointerThreshold(session.originClient, client);
}

export function markNodeDragMoved(
  session: Extract<GraphPointerSession, { kind: 'node-drag' }>,
): Extract<GraphPointerSession, { kind: 'node-drag' }> {
  return {
    ...session,
    moved: true,
  };
}

export function createImagePanSession(pointerId: number, client: GraphPoint): GraphPointerSession {
  return {
    kind: 'image-pan',
    pointerId,
    originClient: client,
    lastClient: client,
    moved: false,
  };
}

export function updateImagePanSession(
  session: Extract<GraphPointerSession, { kind: 'image-pan' }>,
  client: GraphPoint,
): {
  moved: boolean;
  deltaX: number;
  deltaY: number;
  nextSession: Extract<GraphPointerSession, { kind: 'image-pan' }>;
} {
  const deltaX = client.x - session.lastClient.x;
  const deltaY = client.y - session.lastClient.y;
  const moved = session.moved || exceedsPointerThreshold(session.originClient, client);

  return {
    moved,
    deltaX,
    deltaY,
    nextSession: {
      ...session,
      lastClient: client,
      moved,
    },
  };
}

export function createGraphTooltip(
  tooltip: Omit<GraphTooltip, 'x' | 'y'>,
  client: GraphPoint,
): GraphTooltip {
  return {
    ...tooltip,
    x: client.x,
    y: client.y,
  };
}
