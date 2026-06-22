import {
  ExplorerPersistedState,
  restoreGraphViewport,
  restoreImageViewport,
  serializeGraphViewport,
  serializeImageViewport,
} from './graph-persistence';
import { ImageAssetSize, ImageViewport } from './image-viewport';
import { GraphViewport } from './graph.models';

export function prepareExplorerStateForSlugChange(
  state: ExplorerPersistedState | null,
): ExplorerPersistedState | null {
  if (!state) {
    return null;
  }

  return {
    ...state,
    graph: state.graph
      ? {
          ...state.graph,
          positions: {},
          selectedNodeId: null,
        }
      : undefined,
    image: undefined,
  };
}

export interface RestoredGraphStageView {
  current: GraphViewport;
  target: GraphViewport | null;
  shouldMarkGraphViewportReady: boolean;
  shouldMarkInitialGraphViewportReady: boolean;
}

export function restoreResizedGraphStageView(options: {
  previousSize: { width: number; height: number };
  nextSize: { width: number; height: number };
  currentViewport: GraphViewport;
  targetViewport: GraphViewport | null;
}): RestoredGraphStageView | null {
  const { previousSize, nextSize, currentViewport, targetViewport } = options;

  if (targetViewport && previousSize.width && previousSize.height) {
    const restoredCurrent = restoreGraphViewport(
      serializeGraphViewport(currentViewport, previousSize),
      nextSize,
    );
    const restoredTarget = restoreGraphViewport(
      serializeGraphViewport(targetViewport, previousSize),
      nextSize,
    );

    if (!restoredCurrent || !restoredTarget) {
      return null;
    }

    return {
      current: restoredCurrent,
      target: restoredTarget,
      shouldMarkGraphViewportReady: false,
      shouldMarkInitialGraphViewportReady: false,
    };
  }

  if (!previousSize.width || !previousSize.height) {
    return null;
  }

  const restored = restoreGraphViewport(
    serializeGraphViewport(currentViewport, previousSize),
    nextSize,
  );
  if (!restored) {
    return null;
  }

  return {
    current: restored,
    target: null,
    shouldMarkGraphViewportReady: true,
    shouldMarkInitialGraphViewportReady: true,
  };
}

export function restoreResizedImageStageView(options: {
  previousSize: { width: number; height: number };
  nextSize: { width: number; height: number };
  viewport: ImageViewport;
  asset: ImageAssetSize;
  entityType: string;
}): ImageViewport | null {
  const { previousSize, nextSize, viewport, asset, entityType } = options;
  if (!previousSize.width || !previousSize.height) {
    return null;
  }

  return restoreImageViewport(serializeImageViewport(viewport, previousSize), nextSize, asset, {
    entityType,
  });
}

export function shouldRestoreGraphStageAfterResize(options: {
  previousSize: { width: number; height: number };
  graphViewportReady: boolean;
}): boolean {
  return (
    !!options.previousSize.width && !!options.previousSize.height && options.graphViewportReady
  );
}

export function shouldSyncImageStageAfterResize(options: {
  previousSize: { width: number; height: number };
  imageViewportReady: boolean;
}): boolean {
  return (
    !!options.previousSize.width && !!options.previousSize.height && options.imageViewportReady
  );
}

export function readMeasuredStageSize(
  host: HTMLElement | null | undefined,
): { width: number; height: number } | null {
  if (!host) {
    return null;
  }

  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height,
  };
}

export function reconnectResizeObserver(options: {
  observer: ResizeObserver | undefined;
  host: HTMLElement | null | undefined;
  onMeasure: () => void;
}): ResizeObserver | undefined {
  options.observer?.disconnect();

  if (!options.host) {
    return undefined;
  }

  options.onMeasure();
  const observer = new ResizeObserver(options.onMeasure);
  observer.observe(options.host);
  return observer;
}
