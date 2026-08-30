import {
  MediaOriginType,
  MediaProvider,
  MediaQualityTier,
  MediaRole,
  PrismaClient,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const apply = process.argv.includes('--apply');

const fallbackByType: Record<string, string> = {
  ARTWORK: '/assets/home/artwork.jpg',
  ARTIST: '/assets/home/artist.jpg',
  PERSON: '/assets/home/artist.jpg',
  MOVEMENT: '/assets/home/movement.jpg',
  PERIOD: '/assets/home/period.jpg',
  CONCEPT: '/assets/home/concept.jpg',
  ORGANIZATION: '/assets/home/museum-room.jpg',
  PLACE: '/assets/home/museum-room.jpg',
  EVENT: '/assets/home/museum-room.jpg',
  ARTICLE: '/assets/home/museum-room.jpg',
  TEXT: '/assets/home/museum-room.jpg',
};

async function main() {
  const entities = await prisma.entity.findMany({
    where: { status: 'PUBLISHED', mediaLinks: { none: {} } },
    select: { id: true, slug: true, title: true, type: true },
    orderBy: { slug: 'asc' },
  });
  const plan = entities.map((entity) => ({
    ...entity,
    url: fallbackByType[entity.type] ?? '/assets/home/museum-room.jpg',
  }));
  console.log(JSON.stringify({ apply, count: plan.length, entities: plan }, null, 2));
  if (!apply) return;

  for (const entity of plan) {
    await prisma.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          url: entity.url,
          displayUrl: entity.url,
          canonicalUrl: entity.url,
          sourcePageUrl: 'https://jano.manuelgodoy.eu/',
          originType: MediaOriginType.EXTERNAL_URL,
          provider: MediaProvider.UNKNOWN,
          qualityTier: MediaQualityTier.LOW,
          alt: `${entity.title} — imagen editorial de referencia JANO`,
          source: 'JANO · fallback editorial por tipo · pendiente de imagen específica',
          license: 'JANO editorial asset',
          mimeType: 'image/jpeg',
        },
      });
      await tx.entityMedia.create({
        data: {
          entityId: entity.id,
          mediaId: media.id,
          role: MediaRole.CARD,
          isPrimary: true,
          displayMode: 'COVER',
        },
      });
    });
  }
  console.log(`Applied ${plan.length} editorial fallback media links.`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
