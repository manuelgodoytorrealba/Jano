import { GraphPoint, GraphViewport } from './graph.models';

export interface ImageAssetSize {
  width: number;
  height: number;
}

export interface ImageViewport extends GraphViewport {
  fitScale: number;
}

export interface ImageViewportOptions {
  entityType?: string | null;
  focusX?: number | null;
  focusY?: number | null;
  zoom?: number | null;
}

const IMAGE_MAX_FACTOR = 6;

export function createImageViewport(
  container: { width: number; height: number },
  asset: ImageAssetSize | null,
  options?: ImageViewportOptions,
): ImageViewport {
  if (!asset?.width || !asset?.height || !container.width || !container.height) {
    return {
      x: 0,
      y: 0,
      scale: 1,
      fitScale: 1,
    };
  }

  const insetX = Math.min(Math.max(container.width * 0.018, 10), 24);
  const insetY = Math.min(Math.max(container.height * 0.02, 12), 24);
  const containScale = Math.max(
    0.01,
    Math.min(
      (container.width - insetX * 2) / asset.width,
      (container.height - insetY * 2) / asset.height,
    ),
  );
  const aspectRatio = asset.width / asset.height;
  const type = (options?.entityType ?? '').toUpperCase();
  const isArtwork = type === 'ARTWORK';
  const isPortraitSubject = type === 'ARTIST' || type === 'PERSON';
  const coverScale = Math.max(
    0.01,
    Math.max(
      (container.width - insetX * 2) / asset.width,
      (container.height - insetY * 2) / asset.height,
    ),
  );

  let scale = containScale;

  if (isPortraitSubject && aspectRatio <= 0.92) {
    scale = Math.max(containScale, coverScale);
  } else if (isArtwork && aspectRatio <= 0.9) {
    scale = Math.max(
      containScale,
      Math.min((container.height * 0.92) / asset.height, (container.width * 0.94) / asset.width),
    );
  } else if (!isArtwork && aspectRatio > 1.05 && aspectRatio < 1.8) {
    scale = Math.max(
      containScale,
      Math.min((container.width * 0.99) / asset.width, (container.height * 0.96) / asset.height),
    );
  }

  const width = asset.width * scale;
  const height = asset.height * scale;

  const fitViewport = {
    fitScale: scale,
    scale,
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
  };

  return applyEditorialViewport(fitViewport, container, asset, options);
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

  const nextScale = clamp(
    viewport.scale * factor,
    viewport.fitScale,
    viewport.fitScale * IMAGE_MAX_FACTOR,
  );
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

  const centeredX = (container.width - imageWidth) / 2;
  const centeredY = (container.height - imageHeight) / 2;
  const lockX = imageWidth <= container.width;
  const lockY = imageHeight <= container.height;
  const minX = lockX ? centeredX : container.width - imageWidth;
  const minY = lockY ? centeredY : container.height - imageHeight;
  const maxX = lockX ? centeredX : 0;
  const maxY = lockY ? centeredY : 0;

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

function applyEditorialViewport(
  viewport: ImageViewport,
  container: { width: number; height: number },
  asset: ImageAssetSize,
  options?: ImageViewportOptions,
): ImageViewport {
  const focusX = normalizePercent(options?.focusX, 50);
  const focusY = normalizePercent(options?.focusY, 50);
  const zoom = normalizeZoom(options?.zoom);

  if (focusX === 50 && focusY === 50 && zoom === 1) {
    return viewport;
  }

  const scale = clamp(
    viewport.fitScale * zoom,
    viewport.fitScale,
    viewport.fitScale * IMAGE_MAX_FACTOR,
  );

  return clampImageViewport(
    {
      ...viewport,
      scale,
      x: container.width / 2 - asset.width * scale * (focusX / 100),
      y: container.height / 2 - asset.height * scale * (focusY / 100),
    },
    container,
    asset,
  );
}

function normalizePercent(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return clamp(value, 0, 100);
}

function normalizeZoom(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }

  return clamp(value, 1, IMAGE_MAX_FACTOR);
}
