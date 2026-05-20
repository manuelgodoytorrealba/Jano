import { ForceLayoutScratch, stepForceLayout } from './graph-layout';
import { GraphData, GraphPoint } from './graph.models';

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
  const settlePolicy = resolveGraphSettlePolicy(options.graph);
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

  if (motion < settlePolicy.motionThreshold) {
    const nextSettledFrames = options.state.graphSettledFrames + 1;
    const graphLayoutActive = nextSettledFrames < settlePolicy.frameThreshold;

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

function resolveGraphSettlePolicy(graph: GraphData): { motionThreshold: number; frameThreshold: number } {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  if (nodeCount >= 34 || edgeCount >= 52) {
    return {
      motionThreshold: 0.46,
      frameThreshold: 7,
    };
  }

  if (nodeCount >= 20 || edgeCount >= 28) {
    return {
      motionThreshold: 0.38,
      frameThreshold: 9,
    };
  }

  return {
    motionThreshold: 0.28,
    frameThreshold: 14,
  };
}
