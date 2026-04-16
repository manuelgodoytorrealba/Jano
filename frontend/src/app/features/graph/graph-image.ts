import {
  clampImageViewport,
  createImageViewport,
  ImageAssetSize,
  ImageViewport,
  panImageViewport,
  zoomImageViewport,
} from './image-viewport';
import { ExplorerPersistedState, restoreImageViewport } from './graph-persistence';
import { GraphPoint } from './graph.models';

export function createResetImageViewport(options: {
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
  entityType: string;
}): ImageViewport | null {
  const { size, asset, entityType } = options;
  if (!asset || !size.width || !size.height) {
    return null;
  }

  return createImageViewport(size, asset, { entityType });
}

export function createImageWheelAnchor(event: WheelEvent, rect: DOMRect): GraphPoint {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function syncGraphImageViewport(options: {
  asset: ImageAssetSize | null;
  size: { width: number; height: number };
  current: ImageViewport;
  persistedImage?: ExplorerPersistedState['image'];
  entityType: string;
  imageViewportReady: boolean;
  forceFit?: boolean;
  mapViewport?: (current: ImageViewport) => ImageViewport;
}): ImageViewport | null {
  const { asset, size, current, persistedImage, entityType, imageViewportReady, forceFit, mapViewport } = options;
  if (!asset || !size.width || !size.height) {
    return null;
  }

  const fit = createImageViewport(size, asset, { entityType });
  const mappedCurrent = mapViewport ? mapViewport(current) : current;
  const restored =
    !forceFit && !imageViewportReady
      ? restoreImageViewport(persistedImage, size, asset, { entityType })
      : null;
  const shouldFit = forceFit || !imageViewportReady || mappedCurrent.scale <= mappedCurrent.fitScale * 1.02;

  return shouldFit
    ? restored ?? fit
    : clampImageViewport(
        {
          ...mappedCurrent,
          fitScale: fit.fitScale,
          scale: Math.max(mappedCurrent.scale, fit.fitScale),
        },
        size,
        asset,
      );
}

export function zoomGraphImageViewport(options: {
  current: ImageViewport;
  factor: number;
  anchor: GraphPoint;
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
}): ImageViewport | null {
  const { current, factor, anchor, size, asset } = options;
  if (!asset || !size.width || !size.height) {
    return null;
  }

  return zoomImageViewport(current, factor, anchor, size, asset);
}

export function panGraphImageViewport(options: {
  current: ImageViewport;
  deltaX: number;
  deltaY: number;
  size: { width: number; height: number };
  asset: ImageAssetSize | null;
}): ImageViewport | null {
  const { current, deltaX, deltaY, size, asset } = options;
  if (!asset) {
    return null;
  }

  return panImageViewport(current, deltaX, deltaY, size, asset);
}
