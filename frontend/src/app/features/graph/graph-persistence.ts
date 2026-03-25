import { GraphPoint, GraphViewport } from './graph.models';
import { clampImageViewport, createImageViewport, ImageAssetSize, ImageViewport } from './image-viewport';
import { focusGraphPoint } from './graph-viewport';

const STORAGE_PREFIX = 'jano:entity-explorer';

export interface ExplorerPersistedState {
  graph?: {
    focus: GraphPoint;
    scale: number;
    positions?: Record<string, GraphPoint>;
    selectedNodeId?: string | null;
    labelsMode?: 'auto' | 'always' | 'hidden';
    entityTypeFilters?: Record<string, boolean>;
    relationTypeFilters?: Record<string, boolean>;
  };
  image?: {
    center: GraphPoint;
    scaleRatio: number;
  };
  updatedAt: number;
}

export function loadExplorerState(slug: string): ExplorerPersistedState | null {
  if (!canUseStorage() || !slug) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as ExplorerPersistedState) : null;
  } catch {
    return null;
  }
}

export function saveExplorerState(slug: string, state: ExplorerPersistedState): void {
  if (!canUseStorage() || !slug) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(state));
  } catch {
    // Ignore storage failures; the explorer must still work without persistence.
  }
}

export function serializeGraphViewport(viewport: GraphViewport, size: { width: number; height: number }) {
  return {
    focus: {
      x: (size.width / 2 - viewport.x) / viewport.scale,
      y: (size.height / 2 - viewport.y) / viewport.scale,
    },
    scale: viewport.scale,
  };
}

export function restoreGraphViewport(
  payload: { focus: GraphPoint; scale: number } | undefined,
  size: { width: number; height: number },
): GraphViewport | null {
  if (!payload || !size.width || !size.height) {
    return null;
  }

  return focusGraphPoint(payload.focus, size, payload.scale);
}

export function serializeImageViewport(
  viewport: ImageViewport,
  container: { width: number; height: number },
): { center: GraphPoint; scaleRatio: number } {
  return {
    center: {
      x: (container.width / 2 - viewport.x) / viewport.scale,
      y: (container.height / 2 - viewport.y) / viewport.scale,
    },
    scaleRatio: viewport.fitScale ? viewport.scale / viewport.fitScale : 1,
  };
}

export function restoreImageViewport(
  payload: { center: GraphPoint; scaleRatio: number } | undefined,
  container: { width: number; height: number },
  asset: ImageAssetSize,
): ImageViewport {
  const fit = createImageViewport(container, asset);

  if (!payload) {
    return fit;
  }

  const nextScale = Math.min(fit.fitScale * 6, Math.max(fit.fitScale, fit.fitScale * payload.scaleRatio));

  return clampImageViewport(
    {
      ...fit,
      scale: nextScale,
      x: container.width / 2 - payload.center.x * nextScale,
      y: container.height / 2 - payload.center.y * nextScale,
    },
    container,
    asset,
  );
}

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}:${slug}`;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}
