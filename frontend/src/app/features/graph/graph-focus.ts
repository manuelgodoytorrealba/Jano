import { GraphData, GraphPoint, GraphViewport } from './graph.models';

export type GraphSelectionSource = 'center' | 'explicit';

export interface GraphViewportFocusPlan {
  selectedNodeId: string;
  selectedNodeSource: GraphSelectionSource;
  shouldPinCenter: boolean;
  shouldCancelPendingInitialFocus: boolean;
  shouldClearViewportTarget: boolean;
  shouldMarkGraphViewportReady: boolean;
  shouldMarkInitialGraphViewportReady: boolean;
  shouldBumpRenderTick: boolean;
  nextViewport: GraphViewport;
  animate: boolean;
}

interface CenterSelectionOptions {
  graph: GraphData;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
}

interface CurrentEntityFocusOptions {
  graph: GraphData;
  animate: boolean;
  pendingInitialEntityFocus: boolean;
  createEntityFocusedGraphViewport: () => GraphViewport | null;
}

interface NodeFocusOptions {
  graph: GraphData;
  nodeId: string;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
}

export function createCenterSelectionPlan(
  options: CenterSelectionOptions,
): GraphViewportFocusPlan | null {
  const nextViewport = options.createViewportCenteredOnPoint(
    options.getNodePoint(options.graph.centerId),
    Math.max(options.currentScale, 0.98),
  );
  if (!nextViewport) {
    return null;
  }

  return {
    selectedNodeId: options.graph.centerId,
    selectedNodeSource: 'center',
    shouldPinCenter: true,
    shouldCancelPendingInitialFocus: false,
    shouldClearViewportTarget: false,
    shouldMarkGraphViewportReady: false,
    shouldMarkInitialGraphViewportReady: false,
    shouldBumpRenderTick: false,
    nextViewport,
    animate: true,
  };
}

export function createCurrentEntityFocusPlan(
  options: CurrentEntityFocusOptions,
): GraphViewportFocusPlan | null {
  const nextViewport = options.createEntityFocusedGraphViewport();
  if (!nextViewport) {
    return null;
  }

  return {
    selectedNodeId: options.graph.centerId,
    selectedNodeSource: 'center',
    shouldPinCenter: true,
    shouldCancelPendingInitialFocus: false,
    shouldClearViewportTarget: !options.animate,
    shouldMarkGraphViewportReady: !options.animate,
    shouldMarkInitialGraphViewportReady: !options.animate && !options.pendingInitialEntityFocus,
    shouldBumpRenderTick: true,
    nextViewport,
    animate: options.animate,
  };
}

export function createNodeFocusPlan(options: NodeFocusOptions): GraphViewportFocusPlan | null {
  const isCenterNode = options.nodeId === options.graph.centerId;
  const nextViewport = options.createViewportCenteredOnPoint(
    options.getNodePoint(options.nodeId),
    Math.max(options.currentScale, isCenterNode ? 0.96 : 1.08),
  );
  if (!nextViewport) {
    return null;
  }

  return {
    selectedNodeId: options.nodeId,
    selectedNodeSource: isCenterNode ? 'center' : 'explicit',
    shouldPinCenter: isCenterNode,
    shouldCancelPendingInitialFocus: true,
    shouldClearViewportTarget: false,
    shouldMarkGraphViewportReady: false,
    shouldMarkInitialGraphViewportReady: false,
    shouldBumpRenderTick: false,
    nextViewport,
    animate: true,
  };
}
