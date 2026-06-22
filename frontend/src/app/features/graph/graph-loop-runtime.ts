import { GraphPointerSession, currentDraggedNodeId } from './graph-interaction';
import { ForceLayoutScratch } from './graph-layout';
import { GraphData, GraphViewport } from './graph.models';
import { ImageViewport } from './image-viewport';
import { advanceImageViewportAnimation } from './graph-state';
import { stepGraphLayoutFrame } from './graph-animation';
import { GraphViewportController } from './graph-runtime-controllers';
import { applyAmbientGraphDrift } from './graph-layout';

export interface GraphLoopState {
  graphLayoutActive: boolean;
  graphLayoutFrames: number;
  graphSettledFrames: number;
}

export interface GraphLoopResult extends GraphLoopState {
  shouldContinue: boolean;
  shouldRender: boolean;
  nextImageViewport: ImageViewport | null;
  nextImageTarget: ImageViewport | null;
  imageAnimationDone: boolean;
}

export function advanceExplorerLoop(options: {
  graph: GraphData | null;
  positions: Record<string, { x: number; y: number }>;
  velocities: Record<string, { x: number; y: number }>;
  layoutScratch?: ForceLayoutScratch | null;
  pointerSession: GraphPointerSession | null;
  ambientMotion: boolean;
  selectedNodeId: string | null;
  loopState: GraphLoopState;
  pinCenterNode: () => void;
  viewportController: GraphViewportController;
  currentGraphViewport: GraphViewport;
  applyGraphViewport: (viewport: GraphViewport) => void;
  onGraphViewportDone: () => void;
  currentImageViewport: ImageViewport;
  targetImageViewport: ImageViewport | null;
}): GraphLoopResult {
  let shouldContinue = false;
  let shouldRender = false;
  let graphLayoutActive = options.loopState.graphLayoutActive;
  let graphLayoutFrames = options.loopState.graphLayoutFrames;
  let graphSettledFrames = options.loopState.graphSettledFrames;

  if (options.graph) {
    const draggingNodeId = currentDraggedNodeId(options.pointerSession);
    const layoutFrame = stepGraphLayoutFrame({
      graph: options.graph,
      positions: options.positions,
      velocities: options.velocities,
      draggingNodeId,
      layoutScratch: options.layoutScratch ?? undefined,
      state: options.loopState,
      pinCenterNode: options.pinCenterNode,
    });

    graphLayoutActive = layoutFrame.graphLayoutActive;
    graphLayoutFrames = layoutFrame.graphLayoutFrames;
    graphSettledFrames = layoutFrame.graphSettledFrames;
    shouldRender ||= layoutFrame.shouldRender;
    shouldContinue ||= layoutFrame.shouldContinue;

    if (
      options.ambientMotion &&
      draggingNodeId === null &&
      options.selectedNodeId === options.graph.centerId &&
      !layoutFrame.graphLayoutActive
    ) {
      applyAmbientGraphDrift({
        graph: options.graph,
        positions: options.positions,
        layoutScratch: options.layoutScratch ?? undefined,
        timestampMs: Date.now(),
      });
      shouldRender = true;
      shouldContinue = true;
    }
  }

  if (options.viewportController.target) {
    options.viewportController.animate(
      options.currentGraphViewport,
      options.applyGraphViewport,
      options.onGraphViewportDone,
    );
    shouldContinue = true;
  }

  const imageAnimation = advanceImageViewportAnimation(
    options.currentImageViewport,
    options.targetImageViewport,
  );

  if (imageAnimation) {
    shouldContinue = true;
  }

  return {
    graphLayoutActive,
    graphLayoutFrames,
    graphSettledFrames,
    shouldContinue,
    shouldRender,
    nextImageViewport: imageAnimation?.nextViewport ?? null,
    nextImageTarget: imageAnimation?.nextTarget ?? null,
    imageAnimationDone: imageAnimation?.done ?? false,
  };
}
