import {
  animateGraphViewportStep,
  DEFAULT_GRAPH_VIEWPORT_ANIMATION,
  GraphViewportAnimationConfig,
} from './graph-camera';
import { GraphPoint, GraphTooltip, GraphViewport } from './graph.models';
import { currentGraphViewportState } from './graph-camera';

export class GraphViewportController {
  private graphViewportFrameId: number | null = null;
  private targetGraphViewport: GraphViewport | null = null;
  private pendingGraphViewport: GraphViewport | null = null;
  private graphViewportAnimation: GraphViewportAnimationConfig = DEFAULT_GRAPH_VIEWPORT_ANIMATION;

  get target(): GraphViewport | null {
    return this.targetGraphViewport;
  }

  current(viewport: GraphViewport): GraphViewport {
    return currentGraphViewportState(viewport, this.pendingGraphViewport);
  }

  currentOrTarget(viewport: GraphViewport): GraphViewport {
    return this.targetGraphViewport ?? viewport;
  }

  clearTarget(): void {
    this.targetGraphViewport = null;
    this.graphViewportAnimation = DEFAULT_GRAPH_VIEWPORT_ANIMATION;
  }

  restoreTarget(next: GraphViewport | null): void {
    this.targetGraphViewport = next;
  }

  schedule(
    next: GraphViewport,
    isBrowser: boolean,
    apply: (viewport: GraphViewport) => void,
  ): void {
    this.pendingGraphViewport = next;

    if (!isBrowser || this.graphViewportFrameId !== null) {
      return;
    }

    this.graphViewportFrameId = requestAnimationFrame(() => {
      this.graphViewportFrameId = null;
      this.flush(apply);
    });
  }

  flush(apply: (viewport: GraphViewport) => void): void {
    if (!this.pendingGraphViewport) {
      return;
    }

    const pending = this.pendingGraphViewport;
    this.pendingGraphViewport = null;
    apply(pending);
  }

  startAnimation(
    next: GraphViewport,
    config: GraphViewportAnimationConfig,
    apply: (viewport: GraphViewport) => void,
    setAnimating: (value: boolean) => void,
    startLoop: () => void,
  ): void {
    this.flush(apply);
    setAnimating(true);
    this.graphViewportAnimation = config;
    this.targetGraphViewport = next;
    startLoop();
  }

  animate(
    current: GraphViewport,
    apply: (viewport: GraphViewport) => void,
    onDone: () => void,
  ): boolean {
    if (!this.targetGraphViewport) {
      return false;
    }

    const { next, done } = animateGraphViewportStep(
      current,
      this.targetGraphViewport,
      this.graphViewportAnimation,
    );
    apply(next);

    if (done) {
      this.targetGraphViewport = null;
      this.graphViewportAnimation = DEFAULT_GRAPH_VIEWPORT_ANIMATION;
      onDone();
    }

    return true;
  }

  cancelTarget(setAnimating: (value: boolean) => void, setReady: (value: boolean) => void): void {
    if (!this.targetGraphViewport) {
      return;
    }

    this.targetGraphViewport = null;
    this.graphViewportAnimation = DEFAULT_GRAPH_VIEWPORT_ANIMATION;
    setAnimating(false);
    setReady(true);
  }

  destroy(isBrowser: boolean): void {
    if (this.graphViewportFrameId !== null && isBrowser) {
      cancelAnimationFrame(this.graphViewportFrameId);
      this.graphViewportFrameId = null;
    }
  }
}

export class GraphTooltipController {
  private tooltipFrameId: number | null = null;
  private pendingTooltipClient: GraphPoint | null = null;

  schedule(
    point: GraphPoint,
    isBrowser: boolean,
    getTooltip: () => GraphTooltip | null,
    apply: (tooltip: GraphTooltip) => void,
  ): void {
    this.pendingTooltipClient = point;

    if (!isBrowser || this.tooltipFrameId !== null) {
      return;
    }

    this.tooltipFrameId = requestAnimationFrame(() => {
      this.tooltipFrameId = null;
      this.flush(getTooltip, apply);
    });
  }

  flush(getTooltip: () => GraphTooltip | null, apply: (tooltip: GraphTooltip) => void): void {
    if (!this.pendingTooltipClient) {
      return;
    }

    const tooltip = getTooltip();
    if (!tooltip) {
      this.pendingTooltipClient = null;
      return;
    }

    const pending = this.pendingTooltipClient;
    this.pendingTooltipClient = null;
    apply({
      ...tooltip,
      x: pending.x,
      y: pending.y,
    });
  }

  clear(): void {
    this.pendingTooltipClient = null;
  }

  destroy(isBrowser: boolean): void {
    if (this.tooltipFrameId !== null && isBrowser) {
      cancelAnimationFrame(this.tooltipFrameId);
      this.tooltipFrameId = null;
    }
  }
}
