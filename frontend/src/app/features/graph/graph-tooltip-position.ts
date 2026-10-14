export interface TooltipBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Coordinates are relative to the graph stage, outside the transformed SVG.
export function positionGraphTooltip(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  bounds: TooltipBounds,
) {
  const margin = 12;
  const gap = 18;
  const left = bounds.left + margin;
  const top = bounds.top + margin;
  const width = Math.max(0, bounds.right - margin - left);
  const height = Math.max(0, bounds.bottom - margin - top);
  const cardWidth = Math.min(size.width, width);
  const cardHeight = Math.min(size.height, height);
  const x =
    anchor.x + gap + cardWidth <= bounds.right - margin
      ? anchor.x + gap
      : anchor.x - gap - cardWidth;
  const y =
    anchor.y + gap + cardHeight <= bounds.bottom - margin
      ? anchor.y + gap
      : anchor.y - gap - cardHeight;
  return {
    left: Math.max(left, Math.min(x, bounds.right - margin - cardWidth)),
    top: Math.max(top, Math.min(y, bounds.bottom - margin - cardHeight)),
    maxWidth: width,
    maxHeight: height,
  };
}
