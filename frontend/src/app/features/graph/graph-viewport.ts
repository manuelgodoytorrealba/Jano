import { GraphPoint, GraphViewport } from './graph.models';
import { GraphBounds } from './graph-layout';

export const GRAPH_MIN_SCALE = 0.38;
export const GRAPH_MAX_SCALE = 2.4;

export function createGraphViewport(width: number, height: number, scale = 0.82): GraphViewport {
  return {
    x: width / 2,
    y: height / 2,
    scale,
  };
}

export function graphViewportTransform(viewport: GraphViewport): string {
  return `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`;
}

export function panGraphViewport(viewport: GraphViewport, deltaX: number, deltaY: number): GraphViewport {
  return {
    ...viewport,
    x: viewport.x + deltaX,
    y: viewport.y + deltaY,
  };
}

export function clientToGraphWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: GraphViewport,
): GraphPoint {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.scale,
    y: (clientY - rect.top - viewport.y) / viewport.scale,
  };
}

export function zoomGraphViewport(
  viewport: GraphViewport,
  factor: number,
  clientX: number,
  clientY: number,
  rect: DOMRect,
): GraphViewport {
  const worldAnchor = clientToGraphWorld(clientX, clientY, rect, viewport);
  const scale = clamp(viewport.scale * factor, GRAPH_MIN_SCALE, GRAPH_MAX_SCALE);

  return {
    scale,
    x: clientX - rect.left - worldAnchor.x * scale,
    y: clientY - rect.top - worldAnchor.y * scale,
  };
}

export function focusGraphPoint(
  point: GraphPoint,
  size: { width: number; height: number },
  scale: number,
): GraphViewport {
  const safeScale = clamp(scale, GRAPH_MIN_SCALE, GRAPH_MAX_SCALE);

  return {
    scale: safeScale,
    x: size.width / 2 - point.x * safeScale,
    y: size.height / 2 - point.y * safeScale,
  };
}

export function fitGraphBounds(
  bounds: GraphBounds,
  size: { width: number; height: number },
  padding = 96,
): GraphViewport {
  const usableWidth = Math.max(size.width - padding * 2, 1);
  const usableHeight = Math.max(size.height - padding * 2, 1);
  const scale = clamp(Math.min(usableWidth / bounds.width, usableHeight / bounds.height), GRAPH_MIN_SCALE, 1.5);

  return {
    scale,
    x: size.width / 2 - bounds.centerX * scale,
    y: size.height / 2 - bounds.centerY * scale,
  };
}

export function interpolateViewport(
  current: GraphViewport,
  target: GraphViewport,
  easing = 0.18,
  epsilon = 0.8,
): { next: GraphViewport; done: boolean } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const ds = target.scale - current.scale;

  if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon && Math.abs(ds) < 0.004) {
    return { next: target, done: true };
  }

  return {
    done: false,
    next: {
      x: current.x + dx * easing,
      y: current.y + dy * easing,
      scale: current.scale + ds * easing,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
