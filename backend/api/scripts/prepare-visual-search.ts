import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, join } from 'node:path';
import { createHash } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { PUBLIC_MEDIA_DIRECTORIES } from '../src/media/media-variants';
import { VisualSearchService } from '../src/discovery/visual-search.service';
import { readVisualIndex } from '../src/discovery/image-features';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--apply-production'))
    throw new Error('Production indexing requires --apply-production');
  const prisma = new PrismaService(),
    visual = new VisualSearchService();
  let indexed = 0,
    skipped = 0,
    failed = 0;
  try {
    const root = await realpath(resolve('uploads'));
    const items = await prisma.media.findMany({
      where: {
        isVector: false,
        entities: { some: { entity: { status: 'PUBLISHED' } } },
        OR: PUBLIC_MEDIA_DIRECTORIES.map((area) => ({ storageKey: { startsWith: area + '/' } })),
      },
      select: { id: true, storageKey: true, visualIndex: true },
    });
    for (const item of items) {
      try {
        const key = item.storageKey!;
        const area = PUBLIC_MEDIA_DIRECTORIES.find((area) => key.startsWith(area + '/'))!;
        const source = await realpath(resolve(root, key)),
          publicRoot = await realpath(join(root, area));
        if (
          key.includes('\\') ||
          publicRoot !== join(root, area) ||
          !source.startsWith(publicRoot + sep)
        )
          throw new Error('Invalid media path');
        const bytes = await readFile(source);
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (readVisualIndex(item.visualIndex)?.hash === hash) {
          skipped++;
          continue;
        }
        const index = await visual.analyze(bytes);
        await prisma.media.update({ where: { id: item.id }, data: { visualIndex: index } });
        indexed++;
      } catch {
        failed++;
        console.error(`Visual index unavailable for media ${item.id}; original preserved`);
      }
      if ((indexed + failed) % 25 === 0) console.log(JSON.stringify({ indexed, skipped, failed }));
    }
    console.log(JSON.stringify({ indexed, skipped, failed }));
    if (failed) process.exitCode = 1;
  } finally {
    await prisma.onModuleDestroy();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
