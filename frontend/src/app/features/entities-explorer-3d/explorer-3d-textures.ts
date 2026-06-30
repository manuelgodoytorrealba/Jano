import * as THREE from 'three';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { MediaPresentation } from '../../shared/media/media.utils';

export function resolveExplorerImagePlacement(options: {
  imageWidth: number;
  imageHeight: number;
  width: number;
  height: number;
  presentation: MediaPresentation;
}): { drawWidth: number; drawHeight: number; dx: number; dy: number } {
  const { imageWidth, imageHeight, width, height, presentation } = options;
  const baseScale =
    presentation.objectFit === 'contain'
      ? Math.min(width / imageWidth, height / imageHeight)
      : Math.max(width / imageWidth, height / imageHeight);
  const scale = baseScale * presentation.zoom;
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  return {
    drawWidth,
    drawHeight,
    dx: clampDrawOffset(width / 2 - drawWidth * (presentation.focusX / 100), drawWidth, width),
    dy: clampDrawOffset(height / 2 - drawHeight * (presentation.focusY / 100), drawHeight, height),
  };
}

export function wrapExplorerText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
  maxLines = 3,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function createRoundedRectTexture(
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
  strokeWidth = 0,
  alpha = 1,
): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(width, height);
  context.globalAlpha = alpha;
  drawRoundedRect(context, 0, 0, width, height, radius);
  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, 'rgba(255,255,255,0.22)');
  ambient.addColorStop(0.28, 'rgba(255,255,255,0.08)');
  ambient.addColorStop(0.7, 'rgba(255,255,255,0.03)');
  ambient.addColorStop(1, 'rgba(255,255,255,0.1)');
  context.fillStyle = fillStyle;
  context.fill();
  context.fillStyle = ambient;
  context.fill();
  if (strokeStyle && strokeWidth > 0) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
  return canvasTexture(canvas);
}

export function createSpecularHighlightTexture(
  width: number,
  height: number,
  radius: number,
): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(width, height);
  drawRoundedRect(context, 0, 0, width, height, radius);
  context.clip();
  const highlight = context.createLinearGradient(0, 0, width * 0.72, height);
  for (const [stop, color] of [
    [0, 'rgba(255,255,255,0)'],
    [0.14, 'rgba(255,255,255,0)'],
    [0.23, 'rgba(255,255,255,0.62)'],
    [0.31, 'rgba(255,255,255,0.2)'],
    [0.38, 'rgba(255,255,255,0.08)'],
    [0.5, 'rgba(255,255,255,0)'],
    [1, 'rgba(255,255,255,0)'],
  ] as Array<[number, string]>) {
    highlight.addColorStop(stop, color);
  }
  context.fillStyle = highlight;
  context.fillRect(0, 0, width, height);
  const rim = context.createLinearGradient(0, 0, 0, height);
  rim.addColorStop(0, 'rgba(255,255,255,0.22)');
  rim.addColorStop(0.18, 'rgba(255,255,255,0.08)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = rim;
  context.fillRect(0, 0, width, height * 0.18);
  return canvasTexture(canvas);
}

export function createRoundedImageTexture(
  image: HTMLImageElement,
  width: number,
  height: number,
  radius: number,
  presentation: MediaPresentation,
): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(width, height);
  drawRoundedRect(context, 0, 0, width, height, radius);
  context.clip();
  context.fillStyle = '#e9e3dc';
  context.fillRect(0, 0, width, height);
  const draw = resolveExplorerImagePlacement({
    imageWidth: image.width,
    imageHeight: image.height,
    width,
    height,
    presentation,
  });
  context.drawImage(image, draw.dx, draw.dy, draw.drawWidth, draw.drawHeight);
  return canvasTexture(canvas);
}

export function createFallbackImageTexture(
  item: Pick<PublicEntityListItem, 'title' | 'type'>,
  width: number,
  height: number,
  radius: number,
): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(width, height);
  drawRoundedRect(context, 0, 0, width, height, radius);
  context.clip();
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#26221e');
  background.addColorStop(0.48, '#1a1715');
  background.addColorStop(1, '#100f10');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(
    width * 0.52,
    height * 0.24,
    0,
    width * 0.52,
    height * 0.24,
    width * 0.7,
  );
  glow.addColorStop(0, 'rgba(214, 184, 138, 0.16)');
  glow.addColorStop(0.4, 'rgba(214, 184, 138, 0.06)');
  glow.addColorStop(1, 'rgba(214, 184, 138, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(244, 235, 223, 0.16)';
  context.lineWidth = 4;
  context.strokeRect(28, 28, width - 56, height - 56);
  context.textAlign = 'center';
  context.fillStyle = 'rgba(239, 227, 210, 0.52)';
  context.font = '600 36px system-ui';
  context.letterSpacing = '0.12em';
  context.fillText(String(item.type ?? 'Entity').replaceAll('_', ' '), width / 2, height * 0.24);
  context.fillStyle = 'rgba(248, 241, 232, 0.94)';
  context.font = '700 76px system-ui';
  const lines = wrapExplorerText(
    item.title ?? 'JANO',
    (value) => context.measureText(value).width,
    width * 0.66,
  );
  const offset = ((lines.length - 1) * 92) / 2;
  lines.forEach((line, index) =>
    context.fillText(line, width / 2, height * 0.48 - offset + index * 92),
  );
  context.fillStyle = 'rgba(214, 184, 138, 0.7)';
  context.fillRect(width * 0.28, height * 0.77, width * 0.44, 2);
  return canvasTexture(canvas);
}

function clampDrawOffset(offset: number, drawSize: number, viewportSize: number): number {
  if (drawSize <= viewportSize) return (viewportSize - drawSize) / 2;
  return Math.min(0, Math.max(viewportSize - drawSize, offset));
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear canvas 2D');
  context.clearRect(0, 0, width, height);
  return { canvas, context };
}

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}
