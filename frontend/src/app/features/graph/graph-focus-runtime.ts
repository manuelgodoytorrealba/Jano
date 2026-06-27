import { GraphViewport } from './graph.models';

export function runScheduleInitialEntityFocusRuntime(options: {
  schedule: (payload: {
    isBrowser: boolean;
    pendingInitialEntityFocus: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraph: boolean;
    size: { width: number; height: number };
    runFocusPass: () => void;
    hasGraphNow: () => boolean;
    onComplete: () => void;
  }) => void;
  isBrowser: boolean;
  pendingInitialEntityFocus: boolean;
  hasUserAdjustedGraphView: boolean;
  hasGraph: boolean;
  size: { width: number; height: number };
  runFocusPass: () => void;
  hasGraphNow: () => boolean;
  onComplete: () => void;
}): void {
  options.schedule({
    isBrowser: options.isBrowser,
    pendingInitialEntityFocus: options.pendingInitialEntityFocus,
    hasUserAdjustedGraphView: options.hasUserAdjustedGraphView,
    hasGraph: options.hasGraph,
    size: options.size,
    runFocusPass: options.runFocusPass,
    hasGraphNow: options.hasGraphNow,
    onComplete: options.onComplete,
  });
}

export function runEnsureInitialGraphFitRuntime(options: {
  ensureFit: (payload: {
    isBrowser: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraphNow: () => boolean;
    pinCenterNode: () => void;
    computeNextViewport: () => GraphViewport | null;
    applyViewport: (next: GraphViewport) => void;
    onApplied: () => void;
  }) => void;
  isBrowser: boolean;
  hasUserAdjustedGraphView: boolean;
  hasGraphNow: () => boolean;
  pinCenterNode: () => void;
  computeNextViewport: () => GraphViewport | null;
  applyViewport: (next: GraphViewport) => void;
  onApplied: () => void;
}): void {
  options.ensureFit({
    isBrowser: options.isBrowser,
    hasUserAdjustedGraphView: options.hasUserAdjustedGraphView,
    hasGraphNow: options.hasGraphNow,
    pinCenterNode: options.pinCenterNode,
    computeNextViewport: options.computeNextViewport,
    applyViewport: options.applyViewport,
    onApplied: options.onApplied,
  });
}

export function runCancelPendingInitialGraphFocusRuntime(options: {
  cancel: (payload: {
    isBrowser: boolean;
    markUserAdjusted?: boolean;
    onMarkUserAdjusted: () => void;
    onCancelPending: () => void;
  }) => void;
  isBrowser: boolean;
  markUserAdjusted: boolean;
  onMarkUserAdjusted: () => void;
  onCancelPending: () => void;
}): void {
  options.cancel({
    isBrowser: options.isBrowser,
    markUserAdjusted: options.markUserAdjusted,
    onMarkUserAdjusted: options.onMarkUserAdjusted,
    onCancelPending: options.onCancelPending,
  });
}
