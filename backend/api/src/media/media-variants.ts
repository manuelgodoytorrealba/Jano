import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';

export type MediaVariant = { url: string; width: number; height: number };

async function publicImagePath(
  storageKey: string,
  area: 'media' | 'app-backgrounds',
  uploads: string,
) {
  if (!storageKey.startsWith(`${area}/`) || storageKey.includes('\\')) {
    throw new Error('Variants require public local media');
  }
  const root = await realpath(uploads);
  const publicRoot = await realpath(join(root, area));
  const source = await realpath(resolve(root, storageKey));
  if (publicRoot !== join(root, area) || !source.startsWith(publicRoot + sep)) {
    throw new Error('Invalid public media path');
  }
  return { root, source };
}

export async function createMediaVariants(
  storageKey: string,
  uploads = resolve('uploads'),
): Promise<MediaVariant[]> {
  const { root, source } = await publicImagePath(storageKey, 'media', uploads);
  const bytes = await readFile(source);
  const key = createHash('sha256').update('card-webp-v1:').update(bytes).digest('hex');
  const directory = join(root, 'media-variants');
  await mkdir(directory, { recursive: true });
  const variants: MediaVariant[] = [];
  for (const width of [320, 640, 960]) {
    const filename = `${key}-${width}.webp`;
    const output = join(directory, filename);
    try {
      await access(output);
    } catch {
      const temporary = `${output}.${randomUUID()}.tmp`;
      try {
        const buffer = await sharp(bytes, { limitInputPixels: 80_000_000, animated: false })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await writeFile(temporary, buffer);
        await rename(temporary, output);
      } finally {
        await unlink(temporary).catch(() => undefined);
      }
    }
    const metadata = await sharp(output).metadata();
    if (metadata.width && metadata.height && !variants.some((v) => v.width === metadata.width)) {
      variants.push({
        url: `/uploads/media-variants/${filename}`,
        width: metadata.width,
        height: metadata.height,
      });
    }
    if (metadata.width && metadata.width < width) break;
  }
  return variants;
}

export function publicMediaVariants(value: unknown): MediaVariant[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MediaVariant =>
      !!item &&
      typeof item === 'object' &&
      /^\/uploads\/media-variants\/[a-f0-9]{64}-(320|640|960)\.webp$/.test(item.url) &&
      Number.isInteger(item.width) &&
      item.width > 0 &&
      item.width <= 960 &&
      Number.isInteger(item.height) &&
      item.height > 0,
  );
}

export async function createBackgroundVariant(storageKey: string, uploads = resolve('uploads')) {
  const { root, source } = await publicImagePath(storageKey, 'app-backgrounds', uploads);
  const bytes = await readFile(source);
  const key = createHash('sha256').update('background-webp-v1:').update(bytes).digest('hex');
  const filename = `optimized-${key}.webp`;
  const output = join(root, 'app-backgrounds', filename);
  try {
    await access(output);
  } catch {
    const temporary = `${output}.${randomUUID()}.tmp`;
    try {
      const buffer = await sharp(bytes, { limitInputPixels: 80_000_000, animated: false })
        .rotate()
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await writeFile(temporary, buffer);
      await rename(temporary, output);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }
  return `/uploads/app-backgrounds/${filename}`;
}
