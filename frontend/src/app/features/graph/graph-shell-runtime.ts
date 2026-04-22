import { Router } from '@angular/router';
import { GraphViewportFocusPlan } from './graph-focus';
import { createGraphWheelViewport } from './graph-stage-interactions';
import { GraphData, GraphNode, GraphPoint, GraphViewport } from './graph.models';
import { ImageViewport, ImageViewportOptions } from './image-viewport';
import {
  createImageButtonZoomRuntime,
  createImageWheelZoomRuntime,
  createResetImageRuntime,
} from './graph-image-runtime';
import {
  createCenterSelectionRuntime,
  createCurrentEntityFocusRuntime,
  createGraphZoomRuntime,
  createNodeFocusRuntime,
} from './graph-ui-runtime';

type StageSize = { width: number; height: number };

export function runResetImageViewRuntime(options: {
  animate: boolean;
  size: StageSize;
  asset: { width: number; height: number } | null;
  viewportOptions?: ImageViewportOptions;
  setTargetImageViewport: (viewport: ImageViewport | null) => void;
  setImageViewport: (viewport: ImageViewport) => void;
  markImageViewportReady: () => void;
  startAnimationLoop: () => void;
  persist: () => void;
}): void {
  const next = createResetImageRuntime({
    size: options.size,
    asset: options.asset,
    viewportOptions: options.viewportOptions,
  });
  if (!next) {
    return;
  }

  if (options.animate) {
    options.setTargetImageViewport(next);
    options.startAnimationLoop();
    options.persist();
    return;
  }

  options.setTargetImageViewport(null);
  options.setImageViewport(next);
  options.markImageViewportReady();
  options.persist();
}

export function runCenterSelectionRuntime(options: {
  graph: GraphData | null;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
  applyPlan: (plan: GraphViewportFocusPlan) => void;
}): void {
  const plan = createCenterSelectionRuntime({
    graph: options.graph,
    currentScale: options.currentScale,
    getNodePoint: options.getNodePoint,
    createViewportCenteredOnPoint: options.createViewportCenteredOnPoint,
  });
  if (!plan) {
    return;
  }

  options.applyPlan(plan);
}

export function runFocusCurrentEntityRuntime(options: {
  graph: GraphData | null;
  animate: boolean;
  pendingInitialEntityFocus: boolean;
  createEntityFocusedGraphViewport: () => GraphViewport | null;
  applyPlan: (plan: GraphViewportFocusPlan) => void;
}): void {
  const plan = createCurrentEntityFocusRuntime({
    graph: options.graph,
    animate: options.animate,
    pendingInitialEntityFocus: options.pendingInitialEntityFocus,
    createEntityFocusedGraphViewport: options.createEntityFocusedGraphViewport,
  });
  if (!plan) {
    return;
  }

  options.applyPlan(plan);
}

export function runFocusNodeRuntime(options: {
  graph: GraphData | null;
  node: GraphNode | null;
  nodeId: string;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
  applyPlan: (plan: GraphViewportFocusPlan) => void;
}): void {
  const plan = createNodeFocusRuntime({
    graph: options.graph,
    node: options.node,
    nodeId: options.nodeId,
    currentScale: options.currentScale,
    getNodePoint: options.getNodePoint,
    createViewportCenteredOnPoint: options.createViewportCenteredOnPoint,
  });
  if (!plan) {
    return;
  }

  options.applyPlan(plan);
}

export function runOpenSelectedEntityRuntime(options: {
  router: Router;
  node: { slug: string } | null;
}): void {
  if (!options.node) {
    return;
  }

  void options.router.navigate(['/entity', options.node.slug]);
}

export function runAdjustGraphZoomRuntime(options: {
  stage: HTMLElement | null | undefined;
  currentViewport: GraphViewport;
  factor: number;
  cancelPendingInitialGraphFocus: () => void;
  clearViewportTarget: () => void;
  scheduleViewport: (viewport: GraphViewport) => void;
}): void {
  const next = createGraphZoomRuntime({
    stage: options.stage,
    currentViewport: options.currentViewport,
    factor: options.factor,
  });
  if (!next) {
    return;
  }

  options.cancelPendingInitialGraphFocus();
  options.clearViewportTarget();
  options.scheduleViewport(next);
}

export function runAdjustImageZoomRuntime(options: {
  factor: number;
  stage: HTMLElement | null | undefined;
  current: ImageViewport;
  size: StageSize;
  asset: { width: number; height: number } | null;
  setTargetImageViewport: (viewport: ImageViewport | null) => void;
  setImageViewport: (viewport: ImageViewport) => void;
  markImageViewportReady: () => void;
  persist: () => void;
}): void {
  if (!options.stage || !options.asset) {
    return;
  }

  const next = createImageButtonZoomRuntime({
    factor: options.factor,
    stage: options.stage,
    current: options.current,
    size: options.size,
    asset: options.asset,
  });
  if (!next) {
    return;
  }

  options.setTargetImageViewport(null);
  options.setImageViewport(next);
  options.markImageViewportReady();
  options.persist();
}

export function runGraphWheelRuntime(options: {
  event: WheelEvent;
  stage: HTMLElement | null | undefined;
  currentViewport: GraphViewport;
  cancelPendingInitialGraphFocus: () => void;
  clearViewportTarget: () => void;
  scheduleViewport: (viewport: GraphViewport) => void;
}): void {
  options.event.preventDefault();
  if (!options.stage) {
    return;
  }

  options.cancelPendingInitialGraphFocus();
  const factor = options.event.deltaY < 0 ? 1.1 : 0.92;
  options.clearViewportTarget();
  options.scheduleViewport(
    createGraphWheelViewport({
      currentViewport: options.currentViewport,
      factor,
      clientX: options.event.clientX,
      clientY: options.event.clientY,
      rect: options.stage.getBoundingClientRect(),
    }),
  );
}

export function runImageWheelRuntime(options: {
  event: WheelEvent;
  stage: HTMLElement | null | undefined;
  current: ImageViewport;
  size: StageSize;
  asset: { width: number; height: number } | null;
  setTargetImageViewport: (viewport: ImageViewport | null) => void;
  setImageViewport: (viewport: ImageViewport) => void;
  markImageViewportReady: () => void;
  persist: () => void;
}): void {
  options.event.preventDefault();
  if (!options.stage || !options.asset) {
    return;
  }

  const next = createImageWheelZoomRuntime({
    event: options.event,
    stage: options.stage,
    current: options.current,
    size: options.size,
    asset: options.asset,
  });
  if (!next) {
    return;
  }

  options.setTargetImageViewport(null);
  options.setImageViewport(next);
  options.markImageViewportReady();
  options.persist();
}
