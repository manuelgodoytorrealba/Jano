import { ForceLayoutScratch, stepForceLayout } from './graph-layout';
import { GraphData, GraphPoint } from './graph.models';

const GRAPH_LAYOUT_SETTLE_MOTION_THRESHOLD = 0.28;
const GRAPH_LAYOUT_SETTLE_FRAME_THRESHOLD = 14;

export interface GraphLayoutFrameState {
  graphLayoutActive: boolean;
  graphSettledFrames: number;
}

export interface GraphLayoutFrameResult extends GraphLayoutFrameState {
  shouldRender: boolean;
  shouldContinue: boolean;
}

export function resolveDraggingNodeId(pointerSessionKind: string | null | undefined, nodeId?: string): string | null {
  return pointerSessionKind === 'node-drag' ? (nodeId ?? null) : null;
}

export function stepGraphLayoutFrame(options: {
  graph: GraphData;
  positions: Record<string, GraphPoint>;
  velocities: Record<string, GraphPoint>;
  draggingNodeId: string | null;
  layoutScratch?: ForceLayoutScratch;
  state: GraphLayoutFrameState;
  pinCenterNode: () => void;
}): GraphLayoutFrameResult {
  const shouldStepLayout = options.state.graphLayoutActive || options.draggingNodeId !== null;

  if (!shouldStepLayout) {
    return {
      ...options.state,
      shouldRender: false,
      shouldContinue: false,
    };
  }

  const motion = stepForceLayout(
    options.graph,
    options.positions,
    options.velocities,
    options.draggingNodeId,
    options.layoutScratch,
  );

  options.pinCenterNode();

  if (options.draggingNodeId !== null) {
    return {
      graphLayoutActive: true,
      graphSettledFrames: 0,
      shouldRender: true,
      shouldContinue: true,
    };
  }

  if (motion < GRAPH_LAYOUT_SETTLE_MOTION_THRESHOLD) {
    const nextSettledFrames = options.state.graphSettledFrames + 1;
    const graphLayoutActive = nextSettledFrames < GRAPH_LAYOUT_SETTLE_FRAME_THRESHOLD;

    return {
      graphLayoutActive,
      graphSettledFrames: nextSettledFrames,
      shouldRender: true,
      shouldContinue: graphLayoutActive,
    };
  }

  return {
    graphLayoutActive: true,
    graphSettledFrames: 0,
    shouldRender: true,
    shouldContinue: true,
  };
}
