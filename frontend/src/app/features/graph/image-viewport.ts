import { GraphPoint, GraphViewport } from './graph.models';

export interface ImageAssetSize {
  width: number;
  height: number;
}

export interface ImageViewport extends GraphViewport {
  fitScale: number;
}

const IMAGE_MAX_FACTOR = 6;

export function createImageViewport(
  container: { width: number; height: number },
  asset: ImageAssetSize | null,
): ImageViewport {
  if (!asset?.width || !asset?.height || !container.width || !container.height) {
    return {
      x: 0,
      y: 0,
      scale: 1,
      fitScale: 1,
    };
  }

  const insetX = Math.min(Math.max(container.width * 0.065, 36), 92);
  const insetY = Math.min(Math.max(container.height * 0.075, 42), 116);
  const fitScale = Math.min(
    1,
    (container.width - insetX * 2) / asset.width,
    (container.height - insetY * 2) / asset.height,
  );
  const width = asset.width * fitScale;
  const height = asset.height * fitScale;

  return {
    fitScale,
    scale: fitScale,
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
  };
}

export function zoomImageViewport(
  viewport: ImageViewport,
  factor: number,
  anchor: GraphPoint,
  container: { width: number; height: number },
  asset: ImageAssetSize | null,
): ImageViewport {
  if (!asset) {
    return viewport;
  }

  const nextScale = clamp(viewport.scale * factor, viewport.fitScale, viewport.fitScale * IMAGE_MAX_FACTOR);
  const assetX = (anchor.x - viewport.x) / viewport.scale;
  const assetY = (anchor.y - viewport.y) / viewport.scale;

  return clampImageViewport(
    {
      ...viewport,
      scale: nextScale,
      x: anchor.x - assetX * nextScale,
      y: anchor.y - assetY * nextScale,
    },
    container,
    asset,
  );
}

export function panImageViewport(
  viewport: ImageViewport,
  deltaX: number,
  deltaY: number,
  container: { width: number; height: number },
  asset: ImageAssetSize | null,
): ImageViewport {
  if (!asset) {
    return viewport;
  }

  return clampImageViewport(
    {
      ...viewport,
      x: viewport.x + deltaX,
      y: viewport.y + deltaY,
    },
    container,
    asset,
  );
}

export function clampImageViewport(
  viewport: ImageViewport,
  container: { width: number; height: number },
  asset: ImageAssetSize,
): ImageViewport {
  const imageWidth = asset.width * viewport.scale;
  const imageHeight = asset.height * viewport.scale;

  const minX = Math.min(0, container.width - imageWidth);
  const minY = Math.min(0, container.height - imageHeight);
  const maxX = imageWidth < container.width ? (container.width - imageWidth) / 2 : 0;
  const maxY = imageHeight < container.height ? (container.height - imageHeight) / 2 : 0;

  return {
    ...viewport,
    fitScale: viewport.fitScale,
    x: clamp(viewport.x, minX, maxX),
    y: clamp(viewport.y, minY, maxY),
  };
}

export function imageViewportTransform(viewport: ImageViewport): string {
  return `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`;
}

export function interpolateImageViewport(
  current: ImageViewport,
  target: ImageViewport,
  easing = 0.2,
): { next: ImageViewport; done: boolean } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const ds = target.scale - current.scale;

  if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && Math.abs(ds) < 0.003) {
    return { next: target, done: true };
  }

  return {
    done: false,
    next: {
      ...current,
      x: current.x + dx * easing,
      y: current.y + dy * easing,
      scale: current.scale + ds * easing,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
