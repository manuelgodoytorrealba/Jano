import { PrismaClient, EntityType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.entity.upsert({
    where: { slug: 'obra-demo' },
    update: {},
    create: {
      type: EntityType.ARTWORK,
      title: 'Obra demo',
      slug: 'obra-demo',
      summary: 'Primera obra de prueba para JANO.',
      startYear: 1950,
      endYear: 1960,
      metadata: {
        imageUrl: 'https://picsum.photos/900/1200',
        technique: 'Óleo sobre lienzo',
        dimensions: '90 × 120 cm',
      },
    },
  });

  await prisma.entity.upsert({
    where: { slug: 'tiempo' },
    update: {},
    create: {
      type: EntityType.CONCEPT,
      title: 'Tiempo',
      slug: 'tiempo',
      summary: 'Concepto abstracto ligado a memoria, cambio y finitud.',
    },
  });

  const artwork = await prisma.entity.findUnique({ where: { slug: 'obra-demo' } });
  const concept = await prisma.entity.findUnique({ where: { slug: 'tiempo' } });

  if (artwork && concept) {
    await prisma.relation.createMany({
      data: [
        {
          fromId: artwork.id,
          toId: concept.id,
          type: 'EXPLORES',
          note: 'La obra explora el tiempo como tema central.',
          weight: 1,
        },
      ],
      skipDuplicates: true,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });