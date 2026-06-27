import {
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  FAST_GRAPH_VIEWPORT_ANIMATION,
  GraphViewportAnimationConfig,
} from './graph-camera';
import { GraphPoint, GraphTooltip, GraphViewport } from './graph.models';
import { GraphTooltipController, GraphViewportController } from './graph-runtime-controllers';
import { GraphViewportFocusPlan } from './graph-focus';

export function applyGraphViewportFocusPlanRuntime(options: {
  plan: GraphViewportFocusPlan;
  viewportController: GraphViewportController;
  setSelectedNodeSource: () => void;
  setSelectedNodeId: () => void;
  pinCenterNode: () => void;
  setViewport: (viewport: GraphViewport) => void;
  setGraphViewportReady: (value: boolean) => void;
  setInitialGraphViewportReady: (value: boolean) => void;
  bumpRenderTick: () => void;
  onCancelPendingInitialFocus: () => void;
  onStartAnimation: (next: GraphViewport, config: GraphViewportAnimationConfig) => void;
  onPersist: () => void;
}): void {
  if (options.plan.shouldCancelPendingInitialFocus) {
    options.onCancelPendingInitialFocus();
  }

  options.setSelectedNodeSource();
  options.setSelectedNodeId();

  if (options.plan.shouldPinCenter) {
    options.pinCenterNode();
  }

  if (options.plan.animate) {
    options.onStartAnimation(options.plan.nextViewport, FAST_GRAPH_VIEWPORT_ANIMATION);
  } else {
    if (options.plan.shouldClearViewportTarget) {
      options.viewportController.clearTarget();
    }
    options.setViewport(options.plan.nextViewport);
    if (options.plan.shouldMarkGraphViewportReady) {
      options.setGraphViewportReady(true);
    }
    if (options.plan.shouldMarkInitialGraphViewportReady) {
      options.setInitialGraphViewportReady(true);
    }
  }

  if (options.plan.shouldBumpRenderTick) {
    options.bumpRenderTick();
  }

  options.onPersist();
}

export function cancelGraphViewportAutomationRuntime(options: {
  viewportController: GraphViewportController;
  setAnimating: (value: boolean) => void;
  setGraphViewportReady: (value: boolean) => void;
}): void {
  options.viewportController.cancelTarget(options.setAnimating, options.setGraphViewportReady);
}

export function startGraphViewportAnimationRuntime(options: {
  viewportController: GraphViewportController;
  next: GraphViewport;
  config?: GraphViewportAnimationConfig;
  setViewport: (viewport: GraphViewport) => void;
  setAnimating: (value: boolean) => void;
  startLoop: () => void;
}): void {
  options.viewportController.startAnimation(
    options.next,
    options.config ?? DEFAULT_GRAPH_VIEWPORT_ANIMATION,
    options.setViewport,
    options.setAnimating,
    options.startLoop,
  );
}

export function scheduleGraphViewportUpdateRuntime(options: {
  viewportController: GraphViewportController;
  next: GraphViewport;
  isBrowser: boolean;
  setViewport: (viewport: GraphViewport) => void;
}): void {
  options.viewportController.schedule(options.next, options.isBrowser, options.setViewport);
}

export function flushPendingGraphViewportRuntime(options: {
  viewportController: GraphViewportController;
  setViewport: (viewport: GraphViewport) => void;
}): void {
  options.viewportController.flush(options.setViewport);
}

export function scheduleTooltipPositionRuntime(options: {
  tooltipController: GraphTooltipController;
  point: GraphPoint;
  isBrowser: boolean;
  getTooltip: () => GraphTooltip | null;
  setTooltip: (tooltip: GraphTooltip) => void;
}): void {
  options.tooltipController.schedule(
    options.point,
    options.isBrowser,
    options.getTooltip,
    options.setTooltip,
  );
}

export function flushPendingTooltipPositionRuntime(options: {
  tooltipController: GraphTooltipController;
  getTooltip: () => GraphTooltip | null;
  setTooltip: (tooltip: GraphTooltip) => void;
}): void {
  options.tooltipController.flush(options.getTooltip, options.setTooltip);
}
