import {
  reconnectResizeObserver,
  readMeasuredStageSize,
  restoreResizedGraphStageView,
  restoreResizedImageStageView,
  shouldRestoreGraphStageAfterResize,
  shouldSyncImageStageAfterResize,
} from './graph-lifecycle';
import { createImageViewport, ImageAssetSize, ImageViewport, ImageViewportOptions } from './image-viewport';
import { GraphViewport } from './graph.models';

export function setupResizeObserverRuntime(options: {
  isBrowser: boolean;
  observer: ResizeObserver | undefined;
  host: HTMLElement | null | undefined;
  onMeasure: () => void;
}): ResizeObserver | undefined {
  if (!options.isBrowser) {
    return options.observer;
  }

  return reconnectResizeObserver({
    observer: options.observer,
    host: options.host,
    onMeasure: options.onMeasure,
  });
}

export function measureGraphStageRuntime(options: {
  host: HTMLElement | null | undefined;
  previousSize: { width: number; height: number };
  graphViewportReady: boolean;
  currentViewport: GraphViewport;
  targetViewport: GraphViewport | null;
}): {
  nextSize: { width: number; height: number } | null;
  restored:
    | {
        current: GraphViewport;
        target: GraphViewport | null;
        shouldMarkGraphViewportReady: boolean;
        shouldMarkInitialGraphViewportReady: boolean;
      }
    | null;
} {
  const nextSize = readMeasuredStageSize(options.host);
  if (!nextSize) {
    return { nextSize: null, restored: null };
  }

  if (
    !shouldRestoreGraphStageAfterResize({
      previousSize: options.previousSize,
      graphViewportReady: options.graphViewportReady,
    })
  ) {
    return { nextSize, restored: null };
  }

  return {
    nextSize,
    restored: restoreResizedGraphStageView({
      previousSize: options.previousSize,
      nextSize,
      currentViewport: options.currentViewport,
      targetViewport: options.targetViewport,
    }),
  };
}

export function measureImageStageRuntime(options: {
  host: HTMLElement | null | undefined;
  previousSize: { width: number; height: number };
  imageViewportReady: boolean;
  viewport: ImageViewport;
  asset: ImageAssetSize | null;
  viewportOptions?: ImageViewportOptions;
}): {
  nextSize: { width: number; height: number } | null;
  nextViewport: ImageViewport | null;
  shouldSyncViewport: boolean;
} {
  const nextSize = readMeasuredStageSize(options.host);
  if (!nextSize) {
    return { nextSize: null, nextViewport: null, shouldSyncViewport: false };
  }

  if (!options.asset) {
    return { nextSize, nextViewport: null, shouldSyncViewport: false };
  }

  if (
    !shouldSyncImageStageAfterResize({
      previousSize: options.previousSize,
      imageViewportReady: options.imageViewportReady,
    })
  ) {
    return { nextSize, nextViewport: null, shouldSyncViewport: true };
  }

  return {
    nextSize,
    nextViewport:
      restoreResizedImageStageView({
        previousSize: options.previousSize,
        nextSize,
        viewport: options.viewport,
        asset: options.asset,
        entityType: options.viewportOptions?.entityType ?? '',
      }) ?? createImageViewport(nextSize, options.asset, options.viewportOptions),
    shouldSyncViewport: false,
  };
}
