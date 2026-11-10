import { mkdtemp, mkdir, readFile, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  createBackgroundVariant,
  createMediaVariants,
  publicMediaVariants,
} from './media-variants';

describe('public media variants', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'jano-variants-'));
    await mkdir(join(root, 'media'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('preserves originals, keeps proportions, reuses files and versions changed content', async () => {
    const path = join(root, 'media', 'art.png');
    const write = (background: string) =>
      sharp({
        create: {
          width: 800,
          height: 1200,
          channels: 3,
          background,
        },
      })
        .png()
        .toFile(path);
    await write('#123456');
    const original = await readFile(path);
    const variants = await createMediaVariants('media/art.png', root);
    expect(variants.map((v) => v.width)).toEqual([320, 640, 800]);
    expect(variants.map((v) => v.height)).toEqual([480, 960, 1200]);
    expect(await readFile(path)).toEqual(original);
    const output = join(root, variants[0].url.replace('/uploads/', ''));
    const modified = (await stat(output)).mtimeMs;
    expect(await createMediaVariants('media/art.png', root)).toEqual(variants);
    expect((await stat(output)).mtimeMs).toBe(modified);
    await write('#654321');
    expect((await createMediaVariants('media/art.png', root))[0].url).not.toBe(variants[0].url);
  });

  it('rejects private paths, traversal and symlinks outside public entity media', async () => {
    await mkdir(join(root, 'research'));
    await symlink('/etc/hosts', join(root, 'media', 'escape'));
    for (const key of [
      'research/private.png',
      'media/../../etc/hosts',
      'media/escape',
      'https://example.com/x',
    ]) {
      await expect(createMediaVariants(key, root)).rejects.toThrow();
    }
    expect(
      publicMediaVariants([{ url: '/uploads/research/private.png', width: 320, height: 320 }]),
    ).toEqual([]);
    expect(publicMediaVariants(null)).toEqual([]);
  });
  it('creates a cached background without replacing the original and rejects private sources', async () => {
    await mkdir(join(root, 'app-backgrounds'));
    const source = join(root, 'app-backgrounds', 'original.png');
    await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#123456' } })
      .png()
      .toFile(source);
    const original = await readFile(source);
    const url = await createBackgroundVariant('app-backgrounds/original.png', root);
    const metadata = await sharp(join(root, url.slice('/uploads/'.length))).metadata();
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(960);
    expect(await createBackgroundVariant('app-backgrounds/original.png', root)).toBe(url);
    expect(await readFile(source)).toEqual(original);
    await expect(createBackgroundVariant('research/private.png', root)).rejects.toThrow();
  });
});
