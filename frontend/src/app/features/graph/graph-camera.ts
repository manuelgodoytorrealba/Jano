import { interpolateViewport, focusGraphPoint } from './graph-viewport';
import { GraphPoint, GraphViewport } from './graph.models';

export interface GraphViewportAnimationConfig {
  easing: number;
  epsilon: number;
}

export const DEFAULT_GRAPH_VIEWPORT_ANIMATION: GraphViewportAnimationConfig = {
  easing: 0.5,
  epsilon: 4.6,
};

export const FAST_GRAPH_VIEWPORT_ANIMATION: GraphViewportAnimationConfig = {
  easing: 0.78,
  epsilon: 4.2,
};

export const INITIAL_GRAPH_FOCUS_TARGET_PASSES = 3;
export const INITIAL_GRAPH_FIT_MAX_ATTEMPTS = 18;
export const INITIAL_GRAPH_FIT_MIN_SCALE = 0.18;

export function graphLabelScaleBucket(scale: number): number {
  if (scale < 0.56) {
    return 0.5;
  }
  if (scale < 0.74) {
    return 0.7;
  }
  if (scale < 0.94) {
    return 0.9;
  }
  if (scale < 1.2) {
    return 1.1;
  }
  return 1.4;
}

export function currentGraphViewportState(
  viewport: GraphViewport,
  pendingViewport: GraphViewport | null,
): GraphViewport {
  return pendingViewport ?? viewport;
}

export function createCenteredGraphViewport(
  point: GraphPoint,
  size: { width: number; height: number },
  scale: number,
): GraphViewport | null {
  if (!size.width || !size.height) {
    return null;
  }

  return focusGraphPoint(point, size, scale);
}

export function animateGraphViewportStep(
  current: GraphViewport,
  target: GraphViewport,
  config: GraphViewportAnimationConfig,
): { next: GraphViewport; done: boolean } {
  return interpolateViewport(current, target, config.easing, config.epsilon);
}

export function shouldScheduleInitialEntityFocus(options: {
  isBrowser: boolean;
  pendingInitialEntityFocus: boolean;
  hasUserAdjustedGraphView: boolean;
  hasGraph: boolean;
  size: { width: number; height: number };
}): boolean {
  return (
    options.isBrowser &&
    options.pendingInitialEntityFocus &&
    !options.hasUserAdjustedGraphView &&
    options.hasGraph &&
    !!options.size.width &&
    !!options.size.height
  );
}

export function shouldEnsureInitialGraphFit(options: {
  isBrowser: boolean;
  hasUserAdjustedGraphView: boolean;
}): boolean {
  return options.isBrowser && !options.hasUserAdjustedGraphView;
}

export function shouldContinueInitialFocusPass(passCount: number): boolean {
  return passCount < INITIAL_GRAPH_FOCUS_TARGET_PASSES;
}

export function shouldRetryInitialGraphFit(attempt: number, nextScale?: number | null): boolean {
  if (attempt >= INITIAL_GRAPH_FIT_MAX_ATTEMPTS) {
    return false;
  }

  if (typeof nextScale === 'number' && nextScale < INITIAL_GRAPH_FIT_MIN_SCALE) {
    return false;
  }

  return true;
}
