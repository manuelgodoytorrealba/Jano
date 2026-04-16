import { ExplorerPersistedState, serializeGraphViewport, serializeImageViewport } from './graph-persistence';
import { GraphData, GraphViewport } from './graph.models';
import { ImageAssetSize, ImageViewport, interpolateImageViewport } from './image-viewport';

export function resolveLiveStageSize(
  host: HTMLElement | null | undefined,
  fallback: { width: number; height: number },
): { width: number; height: number } {
  if (host && typeof host.getBoundingClientRect === 'function') {
    const rect = host.getBoundingClientRect();
    if (rect.width && rect.height) {
      return { width: rect.width, height: rect.height };
    }
  }

  return fallback;
}

export function advanceImageViewportAnimation(
  current: ImageViewport,
  target: ImageViewport | null,
): { nextViewport: ImageViewport; nextTarget: ImageViewport | null; done: boolean } | null {
  if (!target) {
    return null;
  }

  const { next, done } = interpolateImageViewport(current, target);
  return {
    nextViewport: next,
    nextTarget: done ? null : target,
    done,
  };
}

export function createExplorerPersistedState(options: {
  slug: string;
  graph: GraphData | null;
  graphSize: { width: number; height: number };
  graphViewport: GraphViewport;
  positions: Record<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  labelsMode: 'auto' | 'always' | 'hidden';
  entityTypeFilters: Record<string, boolean>;
  relationTypeFilters: Record<string, boolean>;
  asset: ImageAssetSize | null;
  imageSize: { width: number; height: number };
  imageViewport: ImageViewport;
  targetImageViewport: ImageViewport | null;
  imageViewportReady: boolean;
}): ExplorerPersistedState | null {
  if (!options.slug || !options.graph || !options.graphSize.width || !options.graphSize.height) {
    return null;
  }

  const state: ExplorerPersistedState = {
    updatedAt: Date.now(),
    graph: {
      ...serializeGraphViewport(options.graphViewport, options.graphSize),
      positions: { ...options.positions },
      selectedNodeId: options.selectedNodeId,
      labelsMode: options.labelsMode,
      entityTypeFilters: options.entityTypeFilters,
      relationTypeFilters: options.relationTypeFilters,
    },
  };

  if (options.asset && options.imageSize.width && options.imageSize.height && options.imageViewportReady) {
    state.image = serializeImageViewport(options.targetImageViewport ?? options.imageViewport, options.imageSize);
  }

  return state;
}
