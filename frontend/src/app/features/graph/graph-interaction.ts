import { GraphPoint } from './graph.models';

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

export function exceedsPointerThreshold(origin: GraphPoint, current: GraphPoint, threshold = GRAPH_DRAG_THRESHOLD): boolean {
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
