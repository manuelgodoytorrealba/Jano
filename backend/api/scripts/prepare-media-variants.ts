import { PrismaService } from '../src/prisma/prisma.service';
import {
  createBackgroundVariant,
  createMediaVariants,
  PUBLIC_MEDIA_DIRECTORIES,
} from '../src/media/media-variants';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--apply-production'))
    throw new Error('Production preparation requires --apply-production');
  const prisma = new PrismaService();
  let prepared = 0;
  let failed = 0;
  try {
    const items = await prisma.media.findMany({
      where: {
        OR: PUBLIC_MEDIA_DIRECTORIES.map((area) => ({ storageKey: { startsWith: `${area}/` } })),
        isVector: false,
      },
      select: { id: true, storageKey: true },
    });
    for (const item of items) {
      try {
        const variants = await createMediaVariants(item.storageKey!);
        await prisma.media.update({ where: { id: item.id }, data: { variants } });
        prepared++;
      } catch {
        failed++;
        console.error(`Variants unavailable for media ${item.id}; original preserved`);
      }
      if ((prepared + failed) % 100 === 0) console.log(JSON.stringify({ prepared, failed }));
    }
    const background = await prisma.appSetting.findUnique({
      where: { key: 'global.backgroundImageUrl' },
    });
    if (background?.value) {
      const path = new URL(background.value, 'http://local').pathname;
      if (path.startsWith('/uploads/app-backgrounds/') && !path.includes('/optimized-')) {
        const optimized = await createBackgroundVariant(path.slice('/uploads/'.length));
        await prisma.appSetting.update({
          where: { key: background.key },
          data: { value: optimized },
        });
      }
    }
    console.log(JSON.stringify({ prepared, failed }));
    if (failed) process.exitCode = 1;
  } finally {
    await prisma.onModuleDestroy();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
