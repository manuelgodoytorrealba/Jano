import { ForceLayoutScratch, stepForceLayout } from './graph-layout';
import { GraphData, GraphPoint } from './graph.models';

export interface GraphLayoutFrameState {
  graphLayoutActive: boolean;
  graphLayoutFrames: number;
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
  const nextLayoutFrames = options.state.graphLayoutFrames + 1;
  const normalizedMotion = motion / Math.max(options.graph.nodes.length - 1, 1);

  if (options.draggingNodeId !== null) {
    return {
      graphLayoutActive: true,
      graphLayoutFrames: 0,
      graphSettledFrames: 0,
      shouldRender: true,
      shouldContinue: true,
    };
  }

  if (normalizedMotion < settlePolicy.motionThreshold) {
    const nextSettledFrames = options.state.graphSettledFrames + 1;
    const graphLayoutActive =
      nextSettledFrames < settlePolicy.frameThreshold && nextLayoutFrames < settlePolicy.maxFrames;

    return {
      graphLayoutActive,
      graphLayoutFrames: graphLayoutActive ? nextLayoutFrames : 0,
      graphSettledFrames: nextSettledFrames,
      shouldRender: true,
      shouldContinue: graphLayoutActive,
    };
  }

  if (nextLayoutFrames >= settlePolicy.maxFrames) {
    return {
      graphLayoutActive: false,
      graphLayoutFrames: 0,
      graphSettledFrames: 0,
      shouldRender: true,
      shouldContinue: false,
    };
  }

  return {
    graphLayoutActive: true,
    graphLayoutFrames: nextLayoutFrames,
    graphSettledFrames: 0,
    shouldRender: true,
    shouldContinue: true,
  };
}

function resolveGraphSettlePolicy(graph: GraphData): {
  motionThreshold: number;
  frameThreshold: number;
  maxFrames: number;
} {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  if (nodeCount >= 60 || edgeCount >= 120) {
    return {
      motionThreshold: 0.2,
      frameThreshold: 3,
      maxFrames: 24,
    };
  }

  if (nodeCount >= 34 || edgeCount >= 52) {
    return {
      motionThreshold: 0.15,
      frameThreshold: 4,
      maxFrames: 36,
    };
  }

  if (nodeCount >= 20 || edgeCount >= 28) {
    return {
      motionThreshold: 0.11,
      frameThreshold: 5,
      maxFrames: 56,
    };
  }

  return {
    motionThreshold: 0.06,
    frameThreshold: 10,
    maxFrames: 132,
  };
}
