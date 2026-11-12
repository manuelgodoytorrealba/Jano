import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const VISUAL_MODEL = 'Xenova/clip-vit-base-patch32';
export const VISUAL_VERSION = `${VISUAL_MODEL}:q8:rgb-v1`;
export type PaletteColor = { hex: string; weight: number };
export type VisualIndex = {
  version: string;
  hash: string;
  embedding: number[];
  palette: PaletteColor[];
};
export const COLOR_FAMILIES: Record<string, string> = {
  red: '#c64637',
  orange: '#d58040',
  yellow: '#d8bc52',
  green: '#51835c',
  blue: '#477ba6',
  purple: '#85629e',
  pink: '#ce8eaa',
  brown: '#805c40',
  black: '#181818',
  gray: '#888888',
  white: '#ededed',
};
export function lab(hex: string): number[] {
  const rgb = hex
    .match(/[a-f\d]{2}/gi)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function colorDistance(a: string, b: string) {
  const x = lab(a),
    y = lab(b);
  return Math.hypot(...x.map((v, i) => v - y[i]));
}
const FAMILY_LABS = Object.entries(COLOR_FAMILIES).map(([name, hex]) => ({ name, lab: lab(hex) }));
export function paletteFamilies(palette: PaletteColor[]): string[] {
  const families = new Set<string>();
  for (const color of palette) {
    if (color.weight < 0.04) continue;
    const value = lab(color.hex);
    let closest = 'gray',
      distance = Infinity;
    for (const family of FAMILY_LABS) {
      const d = Math.hypot(...value.map((v, i) => v - family.lab[i]));
      if (d < distance) {
        distance = d;
        closest = family.name;
      }
    }
    families.add(closest);
  }
  return [...families];
}
export function paletteScore(palette: PaletteColor[], colors: string[]): number {
  return colors.length
    ? Math.min(
        ...colors.map((color) =>
          Math.max(
            0,
            ...palette
              .filter((c) => c.weight >= 0.025)
              .map((c) => Math.max(0, 1 - colorDistance(c.hex, color) / 0.22)),
          ),
        ),
      )
    : 0;
}
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0;
  const norm = Math.hypot(...a) * Math.hypot(...b);
  return norm ? a.reduce((sum, v, i) => sum + v * b[i], 0) / norm : 0;
}
export function readPalette(value: unknown): PaletteColor[] {
  if (!Array.isArray(value) || value.length > 12) return [];
  return value.filter(
    (c): c is PaletteColor =>
      !!c &&
      typeof c === 'object' &&
      /^#[a-f0-9]{6}$/i.test(c.hex) &&
      Number.isFinite(c.weight) &&
      c.weight > 0 &&
      c.weight <= 1,
  );
}
export function readVisualIndex(value: unknown): VisualIndex | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as VisualIndex;
  return v.version === VISUAL_VERSION &&
    typeof v.hash === 'string' &&
    Array.isArray(v.embedding) &&
    v.embedding.length === 512 &&
    v.embedding.every(Number.isFinite) &&
    Array.isArray(v.palette) &&
    v.palette.length <= 12 &&
    v.palette.every(
      (c) =>
        /^#[a-f0-9]{6}$/i.test(c.hex) && Number.isFinite(c.weight) && c.weight > 0 && c.weight <= 1,
    )
    ? v
    : null;
}
export async function normalizeImage(bytes: Buffer): Promise<Buffer> {
  if (!bytes.length || bytes.length > 12 * 1024 * 1024)
    throw new BadRequestException('Image must be smaller than 12 MB');
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'heif', 'avif'].includes(meta.format ?? '')) throw new Error();
    return await image
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .removeAlpha()
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    throw new BadRequestException('Unsupported or invalid image. Use JPEG, PNG, WebP or AVIF.');
  }
}
export async function extractPalette(bytes: Buffer): Promise<PaletteColor[]> {
  const { data } = await sharp(bytes)
    .resize(64, 64, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key = [r, g, b].map((v) => Math.floor(v / 32)).join(':');
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)
    .map((c) => ({
      hex:
        '#' +
        [c.r, c.g, c.b]
          .map((v) =>
            Math.round(v / c.n)
              .toString(16)
              .padStart(2, '0'),
          )
          .join(''),
      weight: c.n / (data.length / 3),
    }));
}
