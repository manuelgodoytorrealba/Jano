import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development'))
  throw new Error('Foundational idempotency check is development/test only.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function counts() {
  return {
    entities: await prisma.entity.count(),
    relations: await prisma.relation.count(),
    aliases: await prisma.entityAlias.count(),
    research: await prisma.researchProject.count(),
    articles: await prisma.entity.count({ where: { type: 'ARTICLE' } }),
    collections: await prisma.collection.count(),
  };
}

async function main() {
  const before = await counts();
  for (let i = 0; i < 2; i++) {
    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register', 'prisma/seed-foundational.ts'],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) throw new Error(`Foundational seed failed on run ${i + 1}`);
  }
  const after = await counts();
  const stable =
    JSON.stringify({
      entities: before.entities,
      relations: before.relations,
      aliases: before.aliases,
    }) ===
    JSON.stringify({
      entities: after.entities,
      relations: after.relations,
      aliases: after.aliases,
    });
  if (!stable || after.research || after.articles || after.collections)
    throw new Error(`Idempotency/empty-state failure: ${JSON.stringify({ before, after })}`);
  console.log(
    `Foundational idempotency verified: ${after.entities} entities, ${after.relations} relations.`,
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
