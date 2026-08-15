import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { RELATION_TYPES, RELATION_TYPE_EN } from './foundational/relation-types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const [key, label, inverseLabel, directed, category, sortOrder] of RELATION_TYPES) {
    const relationType = await prisma.relationType.upsert({
      where: { key },
      update: { label, inverseLabel, directed, category, sortOrder, isActive: true },
      create: { key, label, inverseLabel, directed, category, sortOrder, isActive: true },
    });
    await prisma.relationTypeTranslation.upsert({
      where: { relationTypeId_locale: { relationTypeId: relationType.id, locale: 'es' } },
      update: { label, inverseLabel },
      create: { relationTypeId: relationType.id, locale: 'es', label, inverseLabel },
    });
    const en = RELATION_TYPE_EN[key];
    await prisma.relationTypeTranslation.upsert({
      where: { relationTypeId_locale: { relationTypeId: relationType.id, locale: 'en' } },
      update: en,
      create: { relationTypeId: relationType.id, locale: 'en', ...en },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: 'JANO Admin', role: UserRole.ADMIN, isBeta: true },
    create: { email, passwordHash, name: 'JANO Admin', role: UserRole.ADMIN, isBeta: true },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
