import { GraphPointerSession } from './graph-interaction';
import { GraphEdge, GraphNode, GraphPoint, GraphTooltip } from './graph.models';
import {
  canClearHoverRuntime,
  createEdgeHoverRuntime,
  createNodeHoverRuntime,
  shouldMoveTooltipRuntime,
} from './graph-ui-runtime';

export function runNodeHoverRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  node: GraphNode | null;
  interruptGraphViewportAutomation: () => void;
  setHoveredNodeId: (value: string | null) => void;
  setHoveredEdgeId: (value: string | null) => void;
  setTooltip: (tooltip: GraphTooltip | null) => void;
}): void {
  const next = createNodeHoverRuntime({
    session: options.pointerSession,
    event: options.event,
    node: options.node,
  });
  if (!next) {
    return;
  }

  options.interruptGraphViewportAutomation();
  options.setHoveredNodeId(next.hoveredNodeId);
  options.setHoveredEdgeId(next.hoveredEdgeId);
  options.setTooltip(next.tooltip);
}

export function runEdgeHoverRuntime(options: {
  pointerSession: GraphPointerSession | null;
  event: PointerEvent;
  edge: GraphEdge;
  interruptGraphViewportAutomation: () => void;
  setHoveredNodeId: (value: string | null) => void;
  setHoveredEdgeId: (value: string | null) => void;
  setTooltip: (tooltip: GraphTooltip | null) => void;
}): void {
  const next = createEdgeHoverRuntime({
    session: options.pointerSession,
    event: options.event,
    edge: options.edge,
  });
  if (!next) {
    return;
  }

  options.interruptGraphViewportAutomation();
  options.setHoveredNodeId(next.hoveredNodeId);
  options.setHoveredEdgeId(next.hoveredEdgeId);
  options.setTooltip(next.tooltip);
}

export function runTooltipMoveRuntime(options: {
  pointerSession: GraphPointerSession | null;
  tooltip: GraphTooltip | null;
  event: PointerEvent;
  interruptGraphViewportAutomation: () => void;
  scheduleTooltipPosition: (point: GraphPoint) => void;
}): void {
  if (!shouldMoveTooltipRuntime(options.pointerSession, options.tooltip)) {
    return;
  }

  options.interruptGraphViewportAutomation();
  options.scheduleTooltipPosition({ x: options.event.clientX, y: options.event.clientY });
}

export function runClearHoverRuntime(options: {
  pointerSession: GraphPointerSession | null;
  clearTooltipController: () => void;
  setHoveredNodeId: (value: string | null) => void;
  setHoveredEdgeId: (value: string | null) => void;
  setTooltip: (tooltip: GraphTooltip | null) => void;
}): void {
  if (!canClearHoverRuntime(options.pointerSession)) {
    return;
  }

  options.setHoveredNodeId(null);
  options.setHoveredEdgeId(null);
  options.clearTooltipController();
  options.setTooltip(null);
}
