import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';

export async function graphThumbnail(image: string, uploads = resolve('uploads')): Promise<string> {
  if (!image.startsWith('/uploads/')) throw new Error('Graph thumbnails require local media');
  const pathname = decodeURIComponent(new URL(image, 'http://local').pathname);
  if (!pathname.startsWith('/uploads/') || pathname.startsWith('/uploads/research/')) {
    throw new Error('Graph thumbnails require public local media');
  }
  const root = await realpath(uploads);
  const source = await realpath(resolve(root, pathname.slice('/uploads/'.length)));
  if (!source.startsWith(root + sep) || source.startsWith(join(root, 'research') + sep))
    throw new Error('Invalid media path');
  const info = await stat(source);
  const key = createHash('sha256').update(`${source}:${info.mtimeMs}:${info.size}`).digest('hex');
  const directory = join(root, 'graph-thumbnails');
  const output = join(directory, `${key}.webp`);
  try {
    await access(output);
    return output;
  } catch {
    // Cache generated derivatives; never modify the original or entity metadata.
  }
  const bytes = await sharp(source, { limitInputPixels: 80_000_000, animated: false })
    .rotate()
    .resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76 })
    .toBuffer();
  await mkdir(directory, { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, output);
  return output;
}
