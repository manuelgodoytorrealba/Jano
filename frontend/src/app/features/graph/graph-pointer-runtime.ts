import { GraphPointerSession } from './graph-interaction';
import { moveNodeDragSession } from './graph-stage-interactions';
import { GraphData, GraphPoint, GraphViewport } from './graph.models';
import {
  beginImagePanRuntime,
  endImagePanRuntime,
  moveImagePanRuntime,
} from './graph-image-runtime';
import {
  beginGraphPanSession,
  beginNodeDragSession,
  endGraphPointerSession,
  moveGraphPanSession,
} from './graph-stage-interactions';
import { ImageViewport } from './image-viewport';

export function runGraphStagePointerDownRuntime(options: {
  event: PointerEvent;
  cancelPendingInitialGraphFocus: () => void;
  setPointerSession: (session: GraphPointerSession | null) => void;
  clearTooltip: () => void;
}): void {
  const session = beginGraphPanSession(options.event);
  if (!session) {
    return;
  }

  options.cancelPendingInitialGraphFocus();
  options.setPointerSession(session);
  options.clearTooltip();
}

export function runGraphStagePointerMoveRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  currentViewport: GraphViewport;
  setPointerSession: (session: GraphPointerSession | null) => void;
  clearViewportTarget: () => void;
  scheduleViewport: (viewport: GraphViewport) => void;
}): void {
  if (options.pointerSession?.kind !== 'graph-pan' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  const moved = moveGraphPanSession({
    session: options.pointerSession,
    client: { x: options.event.clientX, y: options.event.clientY },
    currentViewport: options.currentViewport,
  });

  options.setPointerSession(moved.nextSession);
  if (!moved.nextViewport) {
    return;
  }

  options.clearViewportTarget();
  options.scheduleViewport(moved.nextViewport);
}

export function runGraphStagePointerUpRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  flushPendingGraphViewport: () => void;
  persist: () => void;
  clearPointerSession: () => void;
}): void {
  if (options.pointerSession?.kind !== 'graph-pan' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  endGraphPointerSession(options.event);
  options.flushPendingGraphViewport();
  options.persist();
  options.clearPointerSession();
}

export function runNodePointerDownRuntime(options: {
  event: PointerEvent;
  nodeId: string;
  stage: HTMLElement | null | undefined;
  currentViewport: GraphViewport;
  nodePoint: GraphPoint;
  cancelPendingInitialGraphFocus: () => void;
  setPointerSession: (session: GraphPointerSession | null) => void;
  activateLayout: () => void;
  startAnimationLoop: () => void;
  clearTooltip: () => void;
}): void {
  options.event.stopPropagation();
  if (!options.stage) {
    return;
  }

  options.cancelPendingInitialGraphFocus();
  options.setPointerSession(
    beginNodeDragSession({
      event: options.event,
      nodeId: options.nodeId,
      rect: options.stage.getBoundingClientRect(),
      currentViewport: options.currentViewport,
      nodePoint: options.nodePoint,
    }),
  );
  options.activateLayout();
  options.startAnimationLoop();
  options.clearTooltip();
}

export function runNodePointerMoveRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  graph: GraphData | null;
  stage: HTMLElement | null | undefined;
  currentViewport: GraphViewport;
  pinCenterNode: () => void;
  bumpRenderTick: () => void;
  setNodePosition: (nodeId: string, point: GraphPoint) => void;
  setPointerSession: (session: GraphPointerSession | null) => void;
}): void {
  if (options.pointerSession?.kind !== 'node-drag' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  if (!options.graph || !options.stage) {
    return;
  }

  const moved = moveNodeDragSession({
    session: options.pointerSession,
    event: options.event,
    graph: options.graph,
    rect: options.stage.getBoundingClientRect(),
    currentViewport: options.currentViewport,
  });

  if (!moved.moved) {
    return;
  }

  if (moved.shouldPinCenter) {
    options.pinCenterNode();
    options.bumpRenderTick();
    return;
  }

  if (!moved.nextNodePoint) {
    return;
  }

  options.setNodePosition(options.pointerSession.nodeId, moved.nextNodePoint);
  options.setPointerSession(moved.nextSession);
  options.bumpRenderTick();
}

export function runNodePointerUpRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  focusNode: (nodeId: string) => void;
  activateLayout: () => void;
  startAnimationLoop: () => void;
  persist: () => void;
  clearPointerSession: () => void;
}): void {
  if (options.pointerSession?.kind !== 'node-drag' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  endGraphPointerSession(options.event);
  if (!options.pointerSession.moved) {
    options.focusNode(options.pointerSession.nodeId);
  }
  options.activateLayout();
  options.startAnimationLoop();
  options.persist();
  options.clearPointerSession();
}

export function runNodePointerCancelRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  persist: () => void;
  clearPointerSession: () => void;
}): void {
  if (options.pointerSession?.kind !== 'node-drag' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  endGraphPointerSession(options.event);
  options.persist();
  options.clearPointerSession();
}

export function runImagePointerDownRuntime(options: {
  event: PointerEvent;
  asset: { width: number; height: number } | null;
  setPointerSession: (session: GraphPointerSession | null) => void;
}): void {
  options.setPointerSession(beginImagePanRuntime(options.event, options.asset));
}

export function runImagePointerMoveRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  current: ImageViewport;
  size: { width: number; height: number };
  asset: { width: number; height: number } | null;
  setPointerSession: (session: GraphPointerSession | null) => void;
  setTargetImageViewport: (viewport: ImageViewport | null) => void;
  setImageViewport: (viewport: ImageViewport) => void;
}): void {
  if (options.pointerSession?.kind !== 'image-pan' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  const moved = moveImagePanRuntime({
    session: options.pointerSession,
    event: options.event,
    current: options.current,
    size: options.size,
    asset: options.asset,
  });
  options.setPointerSession(moved.nextSession);
  if (!moved.nextViewport) {
    return;
  }

  options.setTargetImageViewport(null);
  options.setImageViewport(moved.nextViewport);
}

export function runImagePointerUpRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  persist: () => void;
  clearPointerSession: () => void;
}): void {
  if (options.pointerSession?.kind !== 'image-pan' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  endImagePanRuntime(options.event);
  options.persist();
  options.clearPointerSession();
}

export function runImagePointerCancelRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  persist: () => void;
  clearPointerSession: () => void;
}): void {
  if (options.pointerSession?.kind !== 'image-pan' || options.pointerSession.pointerId !== options.event.pointerId) {
    return;
  }

  endImagePanRuntime(options.event);
  options.persist();
  options.clearPointerSession();
}
