import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { foundationalV1VisualPilot } from '../prisma/editorial/foundational-v1-visual-pilot';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  let created = 0;
  let skipped = 0;
  let linkedExisting = 0;

  for (const item of foundationalV1VisualPilot) {
    const entity = await prisma.entity.findUnique({
      where: { slug: item.slug },
      include: { mediaLinks: { include: { media: true } } },
    });
    if (!entity) throw new Error(`Visual pilot entity not found: ${item.slug}`);
    if (entity.mediaLinks.length > 0) {
      const pilotLink = entity.mediaLinks.find(
        (link) =>
          link.media.canonicalUrl === item.canonicalUrl && link.media.provider === item.provider,
      );
      skipped += 1;
      continue;
    }

    const existing = await prisma.media.findFirst({ where: { canonicalUrl: item.canonicalUrl } });
    if (dryRun) {
      if (existing) linkedExisting += 1;
      else created += 1;
      continue;
    }
    const media =
      existing ??
      (await prisma.media.create({
        data: {
          url: item.canonicalUrl,
          displayUrl: item.displayUrl,
          canonicalUrl: item.canonicalUrl,
          sourcePageUrl: item.sourcePageUrl,
          mimeType: 'image/jpeg',
          width: item.width,
          height: item.height,
          provider: item.provider,
          qualityTier: 'HIGH',
          alt: item.alt,
          source: `Wikimedia Commons — ${item.title}`,
          license: item.license,
        },
      }));
    if (existing) linkedExisting += 1;

    await prisma.entityMedia.create({
      data: {
        entityId: entity.id,
        mediaId: media.id,
        role: 'HERO',
        sortOrder: 0,
        isPrimary: true,
        displayMode: 'CONTAIN',
      },
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      { dryRun, entries: foundationalV1VisualPilot.length, created, linkedExisting, skipped },
      null,
      2,
    ),
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
