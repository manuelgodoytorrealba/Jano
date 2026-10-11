import { mkdtemp, mkdir, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { graphThumbnail } from './graph-thumbnail';

describe('graph thumbnails', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'graph-thumb-'));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  it('creates a bounded WebP derivative, reuses it and preserves the original', async () => {
    const source = join(directory, 'original.png');
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#123456' } })
      .png()
      .toFile(source);
    const original = await stat(source);
    const output = await graphThumbnail('/uploads/original.png', directory);
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBe(192);
    expect(metadata.height).toBe(144);
    expect(metadata.format).toBe('webp');
    const cached = await stat(output);
    expect(await graphThumbnail('/uploads/original.png', directory)).toBe(output);
    expect((await stat(output)).mtimeMs).toBe(cached.mtimeMs);
    expect((await stat(source)).mtimeMs).toBe(original.mtimeMs);
  });
  it('rejects remote URLs, private media and symlinks outside uploads', async () => {
    await expect(graphThumbnail('https://example.com/image.jpg', directory)).rejects.toThrow();
    await expect(
      graphThumbnail('https://example.com/uploads/original.png', directory),
    ).rejects.toThrow();
    await expect(graphThumbnail('/uploads/research/private.png', directory)).rejects.toThrow();
    await symlink('/etc/hosts', join(directory, 'escape'));
    await expect(graphThumbnail('/uploads/escape', directory)).rejects.toThrow();
    await mkdir(join(directory, 'research'));
    await symlink(join(directory, 'research'), join(directory, 'alias'));
    await expect(graphThumbnail('/uploads/alias/missing.png', directory)).rejects.toThrow();
  });
});
