import { getEntityTypeConfig } from './graph.config';
import {
  clearPointerCapture,
  createGraphPanSession,
  createGraphTooltip,
  createNodeDragSession,
  didNodeDragMove,
  GraphStageRect,
  GraphPointerSession,
  markNodeDragMoved,
  shouldSuppressHover,
  updateGraphPanSession,
} from './graph-interaction';
import { panGraphViewport, zoomGraphViewport } from './graph-viewport';
import { GraphData, GraphEdge, GraphPoint, GraphTooltip, GraphViewport } from './graph.models';

export function createGraphWheelViewport(options: {
  currentViewport: GraphViewport;
  factor: number;
  clientX: number;
  clientY: number;
  rect: GraphStageRect;
}): GraphViewport {
  return zoomGraphViewport(
    options.currentViewport,
    options.factor,
    options.clientX,
    options.clientY,
    options.rect,
  );
}

export function createGraphZoomViewport(options: {
  currentViewport: GraphViewport;
  factor: number;
  rect: GraphStageRect;
}): GraphViewport {
  return zoomGraphViewport(
    options.currentViewport,
    options.factor,
    options.rect.left + options.rect.width / 2,
    options.rect.top + options.rect.height / 2,
    options.rect,
  );
}

export function beginGraphPanSession(event: PointerEvent): GraphPointerSession | null {
  if ((event.target as HTMLElement | null)?.closest('.graph-node')) {
    return null;
  }

  const currentTarget = event.currentTarget as HTMLElement;
  currentTarget.setPointerCapture(event.pointerId);
  return createGraphPanSession(event.pointerId, { x: event.clientX, y: event.clientY });
}

export function moveGraphPanSession(options: {
  session: Extract<GraphPointerSession, { kind: 'graph-pan' }>;
  client: GraphPoint;
  currentViewport: GraphViewport;
}): {
  nextSession: Extract<GraphPointerSession, { kind: 'graph-pan' }>;
  nextViewport: GraphViewport | null;
} {
  const update = updateGraphPanSession(options.session, options.client);
  return {
    nextSession: update.nextSession,
    nextViewport: update.moved
      ? panGraphViewport(options.currentViewport, update.deltaX, update.deltaY)
      : null,
  };
}

export function endGraphPointerSession(event: PointerEvent): void {
  clearPointerCapture(event.currentTarget, event.pointerId);
}

export function graphClientToWorld(
  clientX: number,
  clientY: number,
  rect: GraphStageRect,
  viewport: GraphViewport,
): GraphPoint {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.scale,
    y: (clientY - rect.top - viewport.y) / viewport.scale,
  };
}

export function beginNodeDragSession(options: {
  event: PointerEvent;
  nodeId: string;
  rect: DOMRect;
  currentViewport: GraphViewport;
  nodePoint: GraphPoint;
}): Extract<GraphPointerSession, { kind: 'node-drag' }> {
  const target = options.event.currentTarget as Element;
  const worldPoint = graphClientToWorld(
    options.event.clientX,
    options.event.clientY,
    options.rect,
    options.currentViewport,
  );

  target.setPointerCapture(options.event.pointerId);
  return createNodeDragSession(
    options.event.pointerId,
    options.nodeId,
    { x: options.event.clientX, y: options.event.clientY },
    {
      x: worldPoint.x - options.nodePoint.x,
      y: worldPoint.y - options.nodePoint.y,
    },
    {
      left: options.rect.left,
      top: options.rect.top,
      width: options.rect.width,
      height: options.rect.height,
    },
  ) as Extract<GraphPointerSession, { kind: 'node-drag' }>;
}

export function moveNodeDragSession(options: {
  session: Extract<GraphPointerSession, { kind: 'node-drag' }>;
  event: PointerEvent;
  graph: GraphData;
  currentViewport: GraphViewport;
}): {
  moved: boolean;
  nextSession: Extract<GraphPointerSession, { kind: 'node-drag' }>;
  nextNodePoint: GraphPoint | null;
  shouldPinCenter: boolean;
} {
  const moved = didNodeDragMove(options.session, {
    x: options.event.clientX,
    y: options.event.clientY,
  });
  if (!moved) {
    return {
      moved: false,
      nextSession: options.session,
      nextNodePoint: null,
      shouldPinCenter: false,
    };
  }

  if (options.session.nodeId === options.graph.centerId) {
    return {
      moved: true,
      nextSession: options.session,
      nextNodePoint: null,
      shouldPinCenter: true,
    };
  }

  const worldPoint = graphClientToWorld(
    options.event.clientX,
    options.event.clientY,
    options.session.stageRect,
    options.currentViewport,
  );

  return {
    moved: true,
    nextSession: markNodeDragMoved(options.session),
    nextNodePoint: {
      x: worldPoint.x - options.session.pointerOffset.x,
      y: worldPoint.y - options.session.pointerOffset.y,
    },
    shouldPinCenter: false,
  };
}

export function createNodeHoverTooltip(options: {
  event: PointerEvent;
  title: string;
  type: string;
  body?: string | null;
}): GraphTooltip {
  return createGraphTooltip(
    {
      kind: 'node',
      title: options.title,
      subtitle: getEntityTypeConfig(options.type).label,
      body: options.body ?? null,
    },
    { x: options.event.clientX, y: options.event.clientY },
  );
}

export function createEdgeHoverTooltip(event: PointerEvent, edge: GraphEdge): GraphTooltip {
  return createGraphTooltip(
    {
      kind: 'edge',
      title: edge.label,
      subtitle: edge.relationType,
      body: edge.justification ?? null,
    },
    { x: event.clientX, y: event.clientY },
  );
}

export function canHandleHover(session: GraphPointerSession | null): boolean {
  return !shouldSuppressHover(session);
}
