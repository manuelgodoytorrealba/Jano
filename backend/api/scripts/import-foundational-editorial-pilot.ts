import { PrismaClient, SourceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { foundationalV1Pilot } from '../prisma/editorial/foundational-v1-pilot';
import { foundationalV1TierAConcepts } from '../prisma/editorial/foundational-v1-tier-a-concepts';
import { foundationalV1TierAWorks } from '../prisma/editorial/foundational-v1-tier-a-works';
import { foundationalV1TierAPlaces } from '../prisma/editorial/foundational-v1-tier-a-places';
import { foundationalV1TierAMovements } from '../prisma/editorial/foundational-v1-tier-a-movements';
import { foundationalV1TierAArtists } from '../prisma/editorial/foundational-v1-tier-a-artists';
import { foundationalV1TierAWorkSummaries } from '../prisma/editorial/foundational-v1-tier-a-work-summaries';
import { entities, relations } from '../prisma/foundational/catalog';
import { editorialInventory } from '../prisma/foundational/editorial-priority';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const emptyOnly = (
  current: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
) =>
  Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value != null && !current?.[key]),
  );

async function main() {
  let filled = 0;
  let skipped = 0;

  const editorialEntries = [
    ...foundationalV1Pilot,
    ...foundationalV1TierAConcepts,
    ...foundationalV1TierAWorks,
    ...foundationalV1TierAPlaces,
    ...foundationalV1TierAMovements,
    ...foundationalV1TierAArtists,
    ...foundationalV1TierAWorkSummaries,
  ];
  for (const item of editorialEntries) {
    const entity = await prisma.entity.findUnique({
      where: { slug: item.slug },
      include: { translations: true },
    });
    if (!entity) throw new Error(`Pilot entity not found: ${item.slug}`);

    for (const locale of ['es', 'en'] as const) {
      const translation = entity.translations.find((entry) => entry.locale === locale);
      const data = emptyOnly(translation, {
        shortDescription: item.summary?.[locale],
        essay: locale === 'es' ? item.essay : undefined,
      });
      if (Object.keys(data).length) {
        await prisma.entityTranslation.update({
          where: { entityId_locale: { entityId: entity.id, locale } },
          data,
        });
        filled += 1;
      } else skipped += 1;
    }

    if (item.definition) {
      if (entity.type === 'CONCEPT') {
        const current = await prisma.conceptDetails.findUnique({ where: { entityId: entity.id } });
        const data = emptyOnly(current, { definition: item.definition });
        if (Object.keys(data).length)
          await prisma.conceptDetails.upsert({
            where: { entityId: entity.id },
            create: { entityId: entity.id, ...data },
            update: data,
          });
      }
      if (entity.type === 'PERIOD') {
        const current = await prisma.periodDetails.findUnique({ where: { entityId: entity.id } });
        const data = emptyOnly(current, { definition: item.definition });
        if (Object.keys(data).length)
          await prisma.periodDetails.upsert({
            where: { entityId: entity.id },
            create: { entityId: entity.id, ...data },
            update: data,
          });
      }
    }

    if (item.details && entity.type === 'ARTWORK') {
      const current = await prisma.artworkDetails.findUnique({ where: { entityId: entity.id } });
      const data = emptyOnly(current, item.details);
      if (Object.keys(data).length) {
        await prisma.artworkDetails.upsert({
          where: { entityId: entity.id },
          create: { entityId: entity.id, ...data },
          update: data,
        });
        filled += 1;
      }
    }

    const existingSource = await prisma.source.findFirst({ where: { url: item.source.url } });
    const source =
      existingSource ??
      (await prisma.source.create({
        data: {
          type: SourceType.WEBSITE,
          title: item.source.title,
          publisher: item.source.publisher,
          url: item.source.url,
        },
      }));
    const sourceRef = await prisma.sourceRef.findFirst({
      where: { entityId: entity.id, sourceId: source.id },
    });
    if (!sourceRef) {
      await prisma.sourceRef.create({
        data: { entityId: entity.id, sourceId: source.id, note: item.source.note },
      });
      filled += 1;
    }
  }

  // Seed dates are canonical identity facts. Mirroring them into ArtistDetails
  // makes the existing public ficha useful without inventing biography.
  const tierAArtists = editorialInventory(entities, relations).filter(
    (entity) => entity.editorialTier === 'A' && entity.type === 'ARTIST',
  );
  for (const item of tierAArtists) {
    const entity = await prisma.entity.findUnique({
      where: { slug: item.slug },
      select: { id: true, startYear: true, endYear: true },
    });
    if (!entity) throw new Error(`Tier A artist not found: ${item.slug}`);
    const current = await prisma.artistDetails.findUnique({ where: { entityId: entity.id } });
    const data = emptyOnly(current, { birthYear: entity.startYear, deathYear: entity.endYear });
    if (Object.keys(data).length) {
      await prisma.artistDetails.upsert({
        where: { entityId: entity.id },
        create: { entityId: entity.id, ...data },
        update: data,
      });
      filled += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        editorialEntities: editorialEntries.length,
        fieldsFilled: filled,
        fieldsAlreadyPresent: skipped,
      },
      null,
      2,
    ),
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
