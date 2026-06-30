import {
  clearPointerCapture,
  createImagePanSession,
  GraphPointerSession,
  updateImagePanSession,
} from './graph-interaction';
import {
  beginGraphPanSession,
  beginNodeDragSession,
  endGraphPointerSession,
  moveGraphPanSession,
  moveNodeDragSession,
} from './graph-stage-interactions';
import { panGraphImageViewport } from './graph-image';
import { GraphData, GraphPoint, GraphViewport } from './graph.models';
import {
  ImageAssetSize,
  ImageViewport,
  panImageViewport,
  zoomImageViewport,
} from './image-viewport';
import { panGraphViewport, zoomGraphViewport } from './graph-viewport';

export class GraphInteractionRuntime {
  pointerSession: GraphPointerSession | null = null;
  private frameId: number | null = null;
  private readonly graphPointers = new Map<number, GraphPoint>();
  private graphPinch: {
    startDistance: number;
    startCenter: GraphPoint;
    startViewport: GraphViewport;
  } | null = null;
  private readonly imagePointers = new Map<number, GraphPoint>();
  private imagePinch: {
    startDistance: number;
    startCenter: GraphPoint;
    startAnchor: GraphPoint;
    startViewport: ImageViewport;
  } | null = null;

  startLoop(isBrowser: boolean, advance: () => boolean): void {
    if (!isBrowser || this.frameId !== null) return;
    const frame = () => {
      if (!advance()) {
        this.frameId = null;
        return;
      }
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
  }

  graphStagePointerDown(options: {
    event: PointerEvent;
    isMobile: boolean;
    stage?: HTMLElement;
    currentViewport: GraphViewport;
    cancelInitialFocus: () => void;
    clearViewportTarget: () => void;
    clearTooltip: () => void;
  }): void {
    if (options.isMobile) this.trackPointer(this.graphPointers, options.event);
    if (this.startGraphPinch(options)) return;

    const session = beginGraphPanSession(options.event);
    if (!session) return;
    options.cancelInitialFocus();
    this.pointerSession = session;
    options.clearTooltip();
  }

  graphStagePointerMove(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    currentViewport: GraphViewport;
    clearViewportTarget: () => void;
    setViewport: (viewport: GraphViewport) => void;
    scheduleViewport: (viewport: GraphViewport) => void;
    markReady: () => void;
  }): boolean {
    if (this.updateGraphPinch(options)) return true;
    const session = this.pointerSession;
    if (session?.kind !== 'graph-pan' || session.pointerId !== options.event.pointerId)
      return false;

    const moved = moveGraphPanSession({
      session,
      client: { x: options.event.clientX, y: options.event.clientY },
      currentViewport: options.currentViewport,
    });
    this.pointerSession = moved.nextSession;
    if (moved.nextViewport) {
      options.clearViewportTarget();
      options.scheduleViewport(moved.nextViewport);
    }
    return true;
  }

  graphStagePointerUp(options: {
    event: PointerEvent;
    flushViewport: () => void;
    persist: () => void;
  }): void {
    if (this.finishGraphPinch(options.event, options.persist)) return;
    const session = this.pointerSession;
    if (session?.kind === 'graph-pan' && session.pointerId === options.event.pointerId) {
      endGraphPointerSession(options.event);
      options.flushViewport();
      options.persist();
      this.pointerSession = null;
    }
    this.untrackPointer(this.graphPointers, options.event);
  }

  nodePointerDown(options: {
    event: PointerEvent;
    nodeId: string;
    stage?: HTMLElement;
    currentViewport: GraphViewport;
    nodePoint: GraphPoint;
    cancelInitialFocus: () => void;
    activateLayout: () => void;
    startLoop: () => void;
    clearTooltip: () => void;
  }): void {
    options.event.stopPropagation();
    if (!options.stage) return;
    options.cancelInitialFocus();
    this.pointerSession = beginNodeDragSession({
      event: options.event,
      nodeId: options.nodeId,
      rect: options.stage.getBoundingClientRect(),
      currentViewport: options.currentViewport,
      nodePoint: options.nodePoint,
    });
    options.activateLayout();
    options.startLoop();
    options.clearTooltip();
  }

  nodePointerMove(options: {
    event: PointerEvent;
    graph: GraphData | null;
    currentViewport: GraphViewport;
    pinCenterNode: () => void;
    setNodePosition: (nodeId: string, point: GraphPoint) => void;
    bumpRenderTick: () => void;
  }): void {
    const session = this.pointerSession;
    if (
      session?.kind !== 'node-drag' ||
      session.pointerId !== options.event.pointerId ||
      !options.graph
    ) {
      return;
    }
    const moved = moveNodeDragSession({
      session,
      event: options.event,
      graph: options.graph,
      currentViewport: options.currentViewport,
    });
    if (!moved.moved) return;
    if (moved.shouldPinCenter) {
      options.pinCenterNode();
      options.bumpRenderTick();
      return;
    }
    if (!moved.nextNodePoint) return;
    options.setNodePosition(session.nodeId, moved.nextNodePoint);
    this.pointerSession = moved.nextSession;
    options.bumpRenderTick();
  }

  nodePointerUp(options: {
    event: PointerEvent;
    focusNode: (nodeId: string) => void;
    activateLayout: () => void;
    startLoop: () => void;
    persist: () => void;
  }): void {
    const session = this.pointerSession;
    if (session?.kind !== 'node-drag' || session.pointerId !== options.event.pointerId) return;
    endGraphPointerSession(options.event);
    if (session.moved) {
      options.activateLayout();
      options.startLoop();
    } else {
      options.focusNode(session.nodeId);
    }
    options.persist();
    this.pointerSession = null;
  }

  nodePointerCancel(event: PointerEvent, persist: () => void): void {
    const session = this.pointerSession;
    if (session?.kind !== 'node-drag' || session.pointerId !== event.pointerId) return;
    endGraphPointerSession(event);
    persist();
    this.pointerSession = null;
  }

  imagePointerDown(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    asset: ImageAssetSize | null;
    currentViewport: ImageViewport;
    clearTarget: () => void;
  }): void {
    this.trackPointer(this.imagePointers, options.event);
    if (this.startImagePinch(options)) return;
    if (!options.asset) return;
    const target = options.event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label')) return;
    (options.event.currentTarget as HTMLElement).setPointerCapture(options.event.pointerId);
    this.pointerSession = createImagePanSession(
      options.event.pointerId,
      this.eventPoint(options.event),
    );
  }

  imagePointerMove(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    currentViewport: ImageViewport;
    size: { width: number; height: number };
    asset: ImageAssetSize | null;
    setTarget: (viewport: ImageViewport | null) => void;
    setViewport: (viewport: ImageViewport) => void;
    markReady: () => void;
  }): void {
    if (this.updateImagePinch(options)) return;
    const session = this.pointerSession;
    if (session?.kind !== 'image-pan' || session.pointerId !== options.event.pointerId) return;
    const moved = updateImagePanSession(session, this.eventPoint(options.event));
    this.pointerSession = moved.nextSession;
    if (!moved.moved) return;
    const next = panGraphImageViewport({
      current: options.currentViewport,
      deltaX: moved.deltaX,
      deltaY: moved.deltaY,
      size: options.size,
      asset: options.asset,
    });
    if (!next) return;
    options.setTarget(null);
    options.setViewport(next);
  }

  imagePointerEnd(event: PointerEvent, persist: () => void): void {
    if (this.finishImagePinch(event, persist)) return;
    const session = this.pointerSession;
    if (session?.kind !== 'image-pan' || session.pointerId !== event.pointerId) return;
    clearPointerCapture(event.currentTarget, event.pointerId);
    persist();
    this.pointerSession = null;
  }

  destroy(isBrowser: boolean): void {
    if (this.frameId !== null && isBrowser) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.pointerSession = null;
    this.graphPointers.clear();
    this.imagePointers.clear();
    this.graphPinch = null;
    this.imagePinch = null;
  }

  private startGraphPinch(options: {
    event: PointerEvent;
    isMobile: boolean;
    stage?: HTMLElement;
    currentViewport: GraphViewport;
    clearViewportTarget: () => void;
  }): boolean {
    if (!options.isMobile || this.graphPointers.size < 2 || !options.stage) return false;
    const [first, second] = Array.from(this.graphPointers.values());
    const rect = options.stage.getBoundingClientRect();
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    this.pointerSession = null;
    options.clearViewportTarget();
    this.graphPinch = {
      startDistance: Math.hypot(second.x - first.x, second.y - first.y),
      startCenter: { x: center.x - rect.left, y: center.y - rect.top },
      startViewport: options.currentViewport,
    };
    options.event.preventDefault();
    return true;
  }

  private updateGraphPinch(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    clearViewportTarget: () => void;
    setViewport: (viewport: GraphViewport) => void;
    markReady: () => void;
  }): boolean {
    if (!this.graphPointers.has(options.event.pointerId)) return false;
    this.graphPointers.set(options.event.pointerId, this.eventPoint(options.event));
    if (!this.graphPinch || !options.stage || this.graphPointers.size < 2) return false;

    const [first, second] = Array.from(this.graphPointers.values());
    const rect = options.stage.getBoundingClientRect();
    const center = {
      x: (first.x + second.x) / 2 - rect.left,
      y: (first.y + second.y) / 2 - rect.top,
    };
    const zoomed = zoomGraphViewport(
      this.graphPinch.startViewport,
      Math.hypot(second.x - first.x, second.y - first.y) /
        Math.max(this.graphPinch.startDistance, 1),
      rect.left + this.graphPinch.startCenter.x,
      rect.top + this.graphPinch.startCenter.y,
      rect,
    );
    options.clearViewportTarget();
    options.setViewport(
      panGraphViewport(
        zoomed,
        center.x - this.graphPinch.startCenter.x,
        center.y - this.graphPinch.startCenter.y,
      ),
    );
    options.markReady();
    options.event.preventDefault();
    return true;
  }

  private finishGraphPinch(event: PointerEvent, persist: () => void): boolean {
    if (!this.graphPointers.has(event.pointerId)) return false;
    this.untrackPointer(this.graphPointers, event);
    if (!this.graphPinch) return false;
    if (this.graphPointers.size < 2) {
      this.graphPinch = null;
      persist();
    }
    return true;
  }

  private startImagePinch(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    asset: ImageAssetSize | null;
    currentViewport: ImageViewport;
    clearTarget: () => void;
  }): boolean {
    if (this.imagePointers.size < 2 || !options.stage || !options.asset) return false;
    const [first, second] = Array.from(this.imagePointers.values());
    const rect = options.stage.getBoundingClientRect();
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    this.pointerSession = null;
    options.clearTarget();
    this.imagePinch = {
      startDistance: Math.hypot(second.x - first.x, second.y - first.y),
      startCenter: { x: center.x - rect.left, y: center.y - rect.top },
      startAnchor: { x: center.x - rect.left, y: center.y - rect.top },
      startViewport: options.currentViewport,
    };
    options.event.preventDefault();
    return true;
  }

  private updateImagePinch(options: {
    event: PointerEvent;
    stage?: HTMLElement;
    size: { width: number; height: number };
    asset: ImageAssetSize | null;
    setViewport: (viewport: ImageViewport) => void;
    markReady: () => void;
  }): boolean {
    if (!this.imagePointers.has(options.event.pointerId)) return false;
    this.imagePointers.set(options.event.pointerId, this.eventPoint(options.event));
    if (!this.imagePinch || !options.stage || !options.asset || this.imagePointers.size < 2) {
      return false;
    }
    const [first, second] = Array.from(this.imagePointers.values());
    const rect = options.stage.getBoundingClientRect();
    const center = {
      x: (first.x + second.x) / 2 - rect.left,
      y: (first.y + second.y) / 2 - rect.top,
    };
    const zoomed = zoomImageViewport(
      this.imagePinch.startViewport,
      Math.hypot(second.x - first.x, second.y - first.y) /
        Math.max(this.imagePinch.startDistance, 1),
      this.imagePinch.startAnchor,
      options.size,
      options.asset,
    );
    if (zoomed) {
      options.setViewport(
        panImageViewport(
          zoomed,
          center.x - this.imagePinch.startCenter.x,
          center.y - this.imagePinch.startCenter.y,
          options.size,
          options.asset,
        ),
      );
      options.markReady();
    }
    options.event.preventDefault();
    return true;
  }

  private finishImagePinch(event: PointerEvent, persist: () => void): boolean {
    if (!this.imagePointers.has(event.pointerId)) return false;
    this.untrackPointer(this.imagePointers, event);
    if (!this.imagePinch) return false;
    if (this.imagePointers.size < 2) {
      this.imagePinch = null;
      persist();
    }
    return true;
  }

  private trackPointer(pointers: Map<number, GraphPoint>, event: PointerEvent): void {
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, this.eventPoint(event));
  }

  private untrackPointer(pointers: Map<number, GraphPoint>, event: PointerEvent): void {
    pointers.delete(event.pointerId);
    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  private eventPoint(event: PointerEvent): GraphPoint {
    return { x: event.clientX, y: event.clientY };
  }
}
