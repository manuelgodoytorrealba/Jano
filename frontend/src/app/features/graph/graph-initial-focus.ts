import {
  shouldContinueInitialFocusPass,
  shouldEnsureInitialGraphFit,
  shouldRetryInitialGraphFit,
  shouldScheduleInitialEntityFocus,
} from './graph-camera';
import { GraphViewport } from './graph.models';

export class GraphInitialFocusController {
  private initialFocusFrameId: number | null = null;
  private initialFocusFallbackId: number | null = null;
  private initialFitFrameId: number | null = null;
  private initialFocusPasses = 0;

  schedule(options: {
    isBrowser: boolean;
    pendingInitialEntityFocus: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraph: boolean;
    size: { width: number; height: number };
    runFocusPass: () => void;
    hasGraphNow: () => boolean;
    onComplete: () => void;
  }): void {
    if (!shouldScheduleInitialEntityFocus(options)) {
      return;
    }

    options.runFocusPass();
    this.initialFocusPasses = 0;

    if (this.initialFocusFrameId !== null) {
      cancelAnimationFrame(this.initialFocusFrameId);
    }

    if (this.initialFocusFallbackId !== null) {
      clearTimeout(this.initialFocusFallbackId);
    }

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

  ensureFit(options: {
    isBrowser: boolean;
    hasUserAdjustedGraphView: boolean;
    hasGraphNow: () => boolean;
    pinCenterNode: () => void;
    computeNextViewport: () => GraphViewport | null;
    applyViewport: (next: GraphViewport) => void;
    onApplied: () => void;
  }): void {
    if (!shouldEnsureInitialGraphFit(options)) {
      return;
    }

    if (this.initialFitFrameId !== null) {
      cancelAnimationFrame(this.initialFitFrameId);
      this.initialFitFrameId = null;
    }

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

  cancel(options: {
    isBrowser: boolean;
    markUserAdjusted?: boolean;
    onMarkUserAdjusted: () => void;
    onCancelPending: () => void;
  }): void {
    if (options.markUserAdjusted) {
      options.onMarkUserAdjusted();
    }

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
    this.cancel({
      isBrowser,
      onMarkUserAdjusted: () => undefined,
      onCancelPending: () => undefined,
    });
  }
}
