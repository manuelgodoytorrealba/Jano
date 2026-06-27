import {
  clearPointerCapture,
  createImagePanSession,
  GraphPointerSession,
  updateImagePanSession,
} from './graph-interaction';
import {
  createImageWheelAnchor,
  createResetImageViewport,
  panGraphImageViewport,
  syncGraphImageViewport,
  zoomGraphImageViewport,
} from './graph-image';
import { ImageAssetSize, ImageViewport, ImageViewportOptions } from './image-viewport';
import { ExplorerPersistedState } from './graph-persistence';
import { GraphPoint } from './graph.models';

export function createImageStageCenterAnchor(stage: HTMLElement): GraphPoint {
  const rect = stage.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

export function beginImagePanRuntime(
  event: PointerEvent,
  asset: ImageAssetSize | null,
): Extract<GraphPointerSession, { kind: 'image-pan' }> | null {
  if (!asset) {
    return null;
  }

  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, textarea, select, label')) {
    return null;
  }

  const currentTarget = event.currentTarget as HTMLElement;
  currentTarget.setPointerCapture(event.pointerId);
  return createImagePanSession(event.pointerId, { x: event.clientX, y: event.clientY }) as Extract<
    GraphPointerSession,
    { kind: 'image-pan' }
  >;
}

export function moveImagePanRuntime(options: {
  session: Extract<GraphPointerSession, { kind: 'image-pan' }>;
  event: PointerEvent;
  current: ImageViewport;
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
}): {
  nextSession: Extract<GraphPointerSession, { kind: 'image-pan' }>;
  nextViewport: ImageViewport | null;
} {
  const update = updateImagePanSession(options.session, {
    x: options.event.clientX,
    y: options.event.clientY,
  });

  return {
    nextSession: update.nextSession,
    nextViewport: update.moved
      ? panGraphImageViewport({
          current: options.current,
          deltaX: update.deltaX,
          deltaY: update.deltaY,
          size: options.size,
          asset: options.asset,
        })
      : null,
  };
}

export function endImagePanRuntime(event: PointerEvent): void {
  clearPointerCapture(event.currentTarget, event.pointerId);
}

export function createImageWheelZoomRuntime(options: {
  event: WheelEvent;
  stage: HTMLElement;
  current: ImageViewport;
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
}): ImageViewport | null {
  const rect = options.stage.getBoundingClientRect();
  return zoomGraphImageViewport({
    current: options.current,
    factor: options.event.deltaY < 0 ? 1.08 : 0.92,
    anchor: createImageWheelAnchor(options.event, rect),
    size: options.size,
    asset: options.asset,
  });
}

export function createImageButtonZoomRuntime(options: {
  factor: number;
  stage: HTMLElement;
  current: ImageViewport;
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
}): ImageViewport | null {
  return zoomGraphImageViewport({
    current: options.current,
    factor: options.factor,
    anchor: createImageStageCenterAnchor(options.stage),
    size: options.size,
    asset: options.asset,
  });
}

export function createResetImageRuntime(options: {
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
  viewportOptions?: ImageViewportOptions;
}): ImageViewport | null {
  return createResetImageViewport(options);
}

export function syncImageViewportRuntime(options: {
  asset: ImageAssetSize | null;
  size: { width: number; height: number };
  current: ImageViewport;
  persistedImage?: ExplorerPersistedState['image'];
  viewportOptions?: ImageViewportOptions;
  imageViewportReady: boolean;
  forceFit?: boolean;
  mapViewport?: (current: ImageViewport) => ImageViewport;
}): ImageViewport | null {
  return syncGraphImageViewport(options);
}
