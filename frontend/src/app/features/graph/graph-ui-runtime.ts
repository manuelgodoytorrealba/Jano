import {
  createCenterSelectionPlan,
  createCurrentEntityFocusPlan,
  createNodeFocusPlan,
  GraphViewportFocusPlan,
} from './graph-focus';
import { GraphPointerSession, GraphStageRect } from './graph-interaction';
import {
  canHandleHover,
  createEdgeHoverTooltip,
  createGraphZoomViewport,
  createNodeHoverTooltip,
} from './graph-stage-interactions';
import { GraphData, GraphEdge, GraphNode, GraphPoint, GraphTooltip, GraphViewport } from './graph.models';

export function createCenterSelectionRuntime(options: {
  graph: GraphData | null;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
}): GraphViewportFocusPlan | null {
  if (!options.graph) {
    return null;
  }

  return createCenterSelectionPlan({
    graph: options.graph,
    currentScale: options.currentScale,
    getNodePoint: options.getNodePoint,
    createViewportCenteredOnPoint: options.createViewportCenteredOnPoint,
  });
}

export function createCurrentEntityFocusRuntime(options: {
  graph: GraphData | null;
  animate: boolean;
  pendingInitialEntityFocus: boolean;
  createEntityFocusedGraphViewport: () => GraphViewport | null;
}): GraphViewportFocusPlan | null {
  if (!options.graph) {
    return null;
  }

  return createCurrentEntityFocusPlan({
    graph: options.graph,
    animate: options.animate,
    pendingInitialEntityFocus: options.pendingInitialEntityFocus,
    createEntityFocusedGraphViewport: options.createEntityFocusedGraphViewport,
  });
}

export function createNodeFocusRuntime(options: {
  graph: GraphData | null;
  node: GraphNode | null;
  nodeId: string;
  currentScale: number;
  getNodePoint: (nodeId: string) => GraphPoint;
  createViewportCenteredOnPoint: (point: GraphPoint, scale: number) => GraphViewport | null;
}): GraphViewportFocusPlan | null {
  if (!options.graph || !options.node) {
    return null;
  }

  return createNodeFocusPlan({
    graph: options.graph,
    nodeId: options.nodeId,
    currentScale: options.currentScale,
    getNodePoint: options.getNodePoint,
    createViewportCenteredOnPoint: options.createViewportCenteredOnPoint,
  });
}

export function createGraphZoomRuntime(options: {
  rect: GraphStageRect | null;
  currentViewport: GraphViewport;
  factor: number;
}): GraphViewport | null {
  if (!options.rect) {
    return null;
  }

  return createGraphZoomViewport({
    currentViewport: options.currentViewport,
    factor: options.factor,
    rect: options.rect,
  });
}

export function createNodeHoverRuntime(options: {
  session: GraphPointerSession | null;
  event: PointerEvent;
  node: GraphNode | null;
}): { hoveredNodeId: string; hoveredEdgeId: null; tooltip: GraphTooltip } | null {
  if (!canHandleHover(options.session) || !options.node) {
    return null;
  }

  return {
    hoveredNodeId: options.node.id,
    hoveredEdgeId: null,
    tooltip: createNodeHoverTooltip({
      event: options.event,
      title: options.node.label,
      type: options.node.type,
      body: options.node.metadata?.summary ?? null,
    }),
  };
}

export function createEdgeHoverRuntime(options: {
  session: GraphPointerSession | null;
  event: PointerEvent;
  edge: GraphEdge;
}): { hoveredNodeId: null; hoveredEdgeId: string; tooltip: GraphTooltip } | null {
  if (!canHandleHover(options.session)) {
    return null;
  }

  return {
    hoveredNodeId: null,
    hoveredEdgeId: options.edge.id,
    tooltip: createEdgeHoverTooltip(options.event, options.edge),
  };
}

export function shouldMoveTooltipRuntime(session: GraphPointerSession | null, tooltip: GraphTooltip | null): boolean {
  return canHandleHover(session) && !!tooltip;
}

export function canClearHoverRuntime(session: GraphPointerSession | null): boolean {
  return canHandleHover(session);
}
