import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development')) {
  throw new Error('Development demo cleanup is forbidden outside development/test.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const slugs = [
    'manifiesto-del-surrealismo',
    'exposicion-internacional-del-surrealismo-1938',
    'bauhaus',
  ];
  await prisma.homeDeckItem.deleteMany({ where: { entity: { slug: { in: slugs } } } });
  await prisma.relation.deleteMany({
    where: { OR: [{ from: { slug: { in: slugs } } }, { to: { slug: { in: slugs } } }] },
  });
  await prisma.entity.deleteMany({ where: { slug: { in: slugs } } });
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
