import { SimpleChanges } from '@angular/core';
import { ExplorerPersistedState } from './graph-persistence';
import { GraphData, GraphPoint } from './graph.models';
import { GraphSelectionSource } from './graph-focus';
import { ImageViewport } from './image-viewport';
import { InitializedLoadedGraphState } from './graph-setup';
import { loadExplorerState } from './graph-persistence';
import { prepareExplorerStateForSlugChange } from './graph-lifecycle';

export function createResetImageViewportState(): ImageViewport {
  return { x: 0, y: 0, scale: 1, fitScale: 1 };
}

export function resetGraphRuntimeState(options: {
  persistedState: ExplorerPersistedState | null;
}): {
  persistedState: ExplorerPersistedState | null;
  graphViewportReady: boolean;
  imageViewportReady: boolean;
  imageViewport: ImageViewport;
  selectedNodeSource: GraphSelectionSource;
  hasUserAdjustedGraphView: boolean;
  pendingInitialEntityFocus: boolean;
  layoutScratch: null;
  targetImageViewport: null;
} {
  return {
    persistedState: options.persistedState,
    graphViewportReady: false,
    imageViewportReady: false,
    imageViewport: createResetImageViewportState(),
    selectedNodeSource: 'center',
    hasUserAdjustedGraphView: false,
    pendingInitialEntityFocus: false,
    layoutScratch: null,
    targetImageViewport: null,
  };
}

export function resetImageRuntimeState(options: {
  persistedState: ExplorerPersistedState | null;
}): {
  persistedState: ExplorerPersistedState | null;
  imageViewportReady: boolean;
  imageViewport: ImageViewport;
  targetImageViewport: null;
} {
  return {
    persistedState: options.persistedState ? { ...options.persistedState, image: undefined } : null,
    imageViewportReady: false,
    imageViewport: createResetImageViewportState(),
    targetImageViewport: null,
  };
}

export function applyLoadedGraphState(options: {
  initialized: InitializedLoadedGraphState;
}): {
  graph: GraphData;
  layoutScratch: InitializedLoadedGraphState['layoutScratch'];
  positions: Record<string, GraphPoint>;
  velocities: Record<string, GraphPoint>;
  entityTypeFilters: Record<string, boolean>;
  relationTypeFilters: Record<string, boolean>;
  labelsMode: 'auto' | 'always' | 'hidden';
  selectedNodeSource: GraphSelectionSource;
  selectedNodeId: string;
  pendingInitialEntityFocus: boolean;
  hasUserAdjustedGraphView: boolean;
  graphViewportReady: boolean;
  graphLayoutActive: boolean;
  graphSettledFrames: number;
} {
  return {
    graph: options.initialized.graph,
    layoutScratch: options.initialized.layoutScratch,
    positions: options.initialized.positions,
    velocities: options.initialized.velocities,
    entityTypeFilters: options.initialized.entityTypeFilters,
    relationTypeFilters: options.initialized.relationTypeFilters,
    labelsMode: options.initialized.labelsMode,
    selectedNodeSource: 'center',
    selectedNodeId: options.initialized.selectedNodeId,
    pendingInitialEntityFocus: options.initialized.pendingInitialEntityFocus,
    hasUserAdjustedGraphView: false,
    graphViewportReady: false,
    graphLayoutActive: options.initialized.graphLayoutActive,
    graphSettledFrames: options.initialized.graphSettledFrames,
  };
}

export function resolveGraphInputChangesRuntime(options: {
  changes: SimpleChanges;
  slug: string;
  persistedState: ExplorerPersistedState | null;
}): {
  slugState: ReturnType<typeof resetGraphRuntimeState> | null;
  imageState: ReturnType<typeof resetImageRuntimeState> | null;
  shouldLoadGraph: boolean;
} {
  const slugChanged = !!options.changes['slug']?.currentValue;
  const imageChanged =
    (!!options.changes['imageUrl'] && !options.changes['imageUrl'].firstChange)
    || (!!options.changes['imageMedia'] && !options.changes['imageMedia'].firstChange);

  return {
    slugState: slugChanged
      ? resetGraphRuntimeState({
          persistedState: prepareExplorerStateForSlugChange(loadExplorerState(options.slug)),
        })
      : null,
    imageState: imageChanged
      ? resetImageRuntimeState({ persistedState: options.persistedState })
      : null,
    shouldLoadGraph: slugChanged,
  };
}

export function buildLoadedGraphRuntime(options: {
  initialized: InitializedLoadedGraphState;
}): ReturnType<typeof applyLoadedGraphState> & {
  layoutScratch: InitializedLoadedGraphState['layoutScratch'];
  positions: Record<string, GraphPoint>;
  velocities: Record<string, GraphPoint>;
} {
  const applied = applyLoadedGraphState({ initialized: options.initialized });
  return {
    ...applied,
    layoutScratch: options.initialized.layoutScratch,
    positions: options.initialized.positions,
    velocities: options.initialized.velocities,
  };
}
