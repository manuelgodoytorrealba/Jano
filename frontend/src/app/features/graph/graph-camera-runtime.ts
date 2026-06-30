import {
  animateGraphViewportStep,
  currentGraphViewportState,
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  FAST_GRAPH_VIEWPORT_ANIMATION,
  GraphViewportAnimationConfig,
  shouldContinueInitialFocusPass,
  shouldEnsureInitialGraphFit,
  shouldRetryInitialGraphFit,
  shouldScheduleInitialEntityFocus,
} from './graph-camera';
import { GraphViewportFocusPlan } from './graph-focus';
import { GraphPoint, GraphTooltip, GraphViewport } from './graph.models';

export class GraphCameraRuntime {
  private viewportFrameId: number | null = null;
  private targetViewport: GraphViewport | null = null;
  private pendingViewport: GraphViewport | null = null;
  private viewportAnimation = DEFAULT_GRAPH_VIEWPORT_ANIMATION;
  private tooltipFrameId: number | null = null;
  private pendingTooltipPoint: GraphPoint | null = null;
  private initialFocusFrameId: number | null = null;
  private initialFocusFallbackId: number | null = null;
  private initialFitFrameId: number | null = null;
  private initialFocusPasses = 0;

  get viewportTarget(): GraphViewport | null {
    return this.targetViewport;
  }

  currentViewport(viewport: GraphViewport): GraphViewport {
    return currentGraphViewportState(viewport, this.pendingViewport);
  }

  currentOrTargetViewport(viewport: GraphViewport): GraphViewport {
    return this.targetViewport ?? viewport;
  }

  clearViewportTarget(): void {
    this.targetViewport = null;
    this.viewportAnimation = DEFAULT_GRAPH_VIEWPORT_ANIMATION;
  }

  restoreViewportTarget(viewport: GraphViewport | null): void {
    this.targetViewport = viewport;
  }

  scheduleViewport(
    viewport: GraphViewport,
    isBrowser: boolean,
    apply: (viewport: GraphViewport) => void,
  ): void {
    this.pendingViewport = viewport;
    if (!isBrowser || this.viewportFrameId !== null) return;

    this.viewportFrameId = requestAnimationFrame(() => {
      this.viewportFrameId = null;
      this.flushViewport(apply);
    });
  }

  flushViewport(apply: (viewport: GraphViewport) => void): void {
    if (!this.pendingViewport) return;
    const pending = this.pendingViewport;
    this.pendingViewport = null;
    apply(pending);
  }

  startViewportAnimation(options: {
    viewport: GraphViewport;
    config?: GraphViewportAnimationConfig;
    apply: (viewport: GraphViewport) => void;
    setAnimating: (value: boolean) => void;
    startLoop: () => void;
  }): void {
    this.flushViewport(options.apply);
    options.setAnimating(true);
    this.viewportAnimation = options.config ?? DEFAULT_GRAPH_VIEWPORT_ANIMATION;
    this.targetViewport = options.viewport;
    options.startLoop();
  }

  animateViewport(
    current: GraphViewport,
    apply: (viewport: GraphViewport) => void,
    onDone: () => void,
  ): boolean {
    if (!this.targetViewport) return false;
    const { next, done } = animateGraphViewportStep(
      current,
      this.targetViewport,
      this.viewportAnimation,
    );
    apply(next);
    if (done) {
      this.clearViewportTarget();
      onDone();
    }
    return true;
  }

  cancelViewportTarget(
    setAnimating: (value: boolean) => void,
    setReady: (value: boolean) => void,
  ): void {
    if (!this.targetViewport) return;
    this.clearViewportTarget();
    setAnimating(false);
    setReady(true);
  }

  applyFocusPlan(options: {
    plan: GraphViewportFocusPlan;
    setSelectedNodeSource: () => void;
    setSelectedNodeId: () => void;
    pinCenterNode: () => void;
    setViewport: (viewport: GraphViewport) => void;
    setGraphViewportReady: (value: boolean) => void;
    setInitialGraphViewportReady: (value: boolean) => void;
    bumpRenderTick: () => void;
    cancelPendingInitialFocus: () => void;
    startAnimation: (viewport: GraphViewport, config: GraphViewportAnimationConfig) => void;
    persist: () => void;
  }): void {
    const { plan } = options;
    if (plan.shouldCancelPendingInitialFocus) options.cancelPendingInitialFocus();
    options.setSelectedNodeSource();
    options.setSelectedNodeId();
    if (plan.shouldPinCenter) options.pinCenterNode();

    if (plan.animate) {
      options.startAnimation(plan.nextViewport, FAST_GRAPH_VIEWPORT_ANIMATION);
    } else {
      if (plan.shouldClearViewportTarget) this.clearViewportTarget();
      options.setViewport(plan.nextViewport);
      if (plan.shouldMarkGraphViewportReady) options.setGraphViewportReady(true);
      if (plan.shouldMarkInitialGraphViewportReady) options.setInitialGraphViewportReady(true);
    }

    if (plan.shouldBumpRenderTick) options.bumpRenderTick();
    options.persist();
  }

  scheduleTooltip(
    point: GraphPoint,
    isBrowser: boolean,
    getTooltip: () => GraphTooltip | null,
    apply: (tooltip: GraphTooltip) => void,
  ): void {
    this.pendingTooltipPoint = point;
    if (!isBrowser || this.tooltipFrameId !== null) return;

    this.tooltipFrameId = requestAnimationFrame(() => {
      this.tooltipFrameId = null;
      this.flushTooltip(getTooltip, apply);
    });
  }

  flushTooltip(
    getTooltip: () => GraphTooltip | null,
    apply: (tooltip: GraphTooltip) => void,
  ): void {
    if (!this.pendingTooltipPoint) return;
    const tooltip = getTooltip();
    if (!tooltip) {
      this.pendingTooltipPoint = null;
      return;
    }
    const point = this.pendingTooltipPoint;
    this.pendingTooltipPoint = null;
    apply({ ...tooltip, x: point.x, y: point.y });
  }

  clearTooltip(): void {
    this.pendingTooltipPoint = null;
  }

  scheduleInitialFocus(options: {
    isBrowser: boolean;
    pendingInitialEntityFocus: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraph: boolean;
    size: { width: number; height: number };
    runFocusPass: () => void;
    hasGraphNow: () => boolean;
    onComplete: () => void;
  }): void {
    if (!shouldScheduleInitialEntityFocus(options)) return;
    options.runFocusPass();
    this.initialFocusPasses = 0;
    if (this.initialFocusFrameId !== null) cancelAnimationFrame(this.initialFocusFrameId);
    if (this.initialFocusFallbackId !== null) clearTimeout(this.initialFocusFallbackId);

    const runPass = () => {
      if (!options.hasGraphNow()) {
        this.initialFocusFrameId = null;
        return;
      }
      options.runFocusPass();
      this.initialFocusPasses += 1;
      if (shouldContinueInitialFocusPass(this.initialFocusPasses)) {
        this.initialFocusFrameId = requestAnimationFrame(runPass);
        return;
      }
      this.initialFocusFrameId = null;
      this.initialFocusFallbackId = null;
      options.onComplete();
    };

    this.initialFocusFallbackId = window.setTimeout(() => {
      if (!options.pendingInitialEntityFocus) {
        this.initialFocusFallbackId = null;
        return;
      }
      this.initialFocusFallbackId = null;
      options.onComplete();
    }, 220);
    this.initialFocusFrameId = requestAnimationFrame(runPass);
  }

  ensureInitialFit(options: {
    isBrowser: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraphNow: () => boolean;
    pinCenterNode: () => void;
    computeNextViewport: () => GraphViewport | null;
    applyViewport: (viewport: GraphViewport) => void;
    onApplied: () => void;
  }): void {
    if (!shouldEnsureInitialGraphFit(options)) return;
    if (this.initialFitFrameId !== null) cancelAnimationFrame(this.initialFitFrameId);

    let attempt = 0;
    const run = () => {
      if (!options.hasGraphNow()) {
        this.initialFitFrameId = null;
        return;
      }
      options.pinCenterNode();
      const next = options.computeNextViewport();
      if (next) {
        options.applyViewport(next);
        options.onApplied();
      }
      if (!shouldRetryInitialGraphFit(attempt, next?.scale)) {
        this.initialFitFrameId = null;
        return;
      }
      attempt += 1;
      this.initialFitFrameId = requestAnimationFrame(run);
    };
    this.initialFitFrameId = requestAnimationFrame(run);
  }

  cancelInitialFocus(options: {
    isBrowser: boolean;
    markUserAdjusted?: boolean;
    onMarkUserAdjusted: () => void;
    onCancelPending: () => void;
  }): void {
    if (options.markUserAdjusted) options.onMarkUserAdjusted();
    options.onCancelPending();
    if (this.initialFocusFrameId !== null && options.isBrowser) {
      cancelAnimationFrame(this.initialFocusFrameId);
      this.initialFocusFrameId = null;
    }
    if (this.initialFitFrameId !== null && options.isBrowser) {
      cancelAnimationFrame(this.initialFitFrameId);
      this.initialFitFrameId = null;
    }
    if (this.initialFocusFallbackId !== null && options.isBrowser) {
      clearTimeout(this.initialFocusFallbackId);
      this.initialFocusFallbackId = null;
    }
  }

  destroy(isBrowser: boolean): void {
    if (this.viewportFrameId !== null && isBrowser) cancelAnimationFrame(this.viewportFrameId);
    if (this.tooltipFrameId !== null && isBrowser) cancelAnimationFrame(this.tooltipFrameId);
    this.viewportFrameId = null;
    this.tooltipFrameId = null;
    this.cancelInitialFocus({
      isBrowser,
      onMarkUserAdjusted: () => undefined,
      onCancelPending: () => undefined,
    });
  }
}
