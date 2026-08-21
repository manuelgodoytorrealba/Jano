import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { RELATION_TYPES, RELATION_TYPE_EN } from './foundational/relation-types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SYSTEM_ENTITY_TYPES = [
  [
    'ARTWORK',
    'Obra',
    'Obras',
    'Una obra y su contexto material, histórico y visual.',
    'O',
    'blue',
    'WORK',
  ],
  [
    'ARTIST',
    'Artista',
    'Artistas',
    'Una trayectoria, práctica y red de influencias.',
    'A',
    'coral',
    'PERSON',
  ],
  [
    'ARTICLE',
    'Artículo',
    'Artículos',
    'Una pieza editorial que interpreta y conecta conocimiento.',
    'R',
    'orange',
    'WORK',
  ],
  [
    'CONCEPT',
    'Concepto',
    'Conceptos',
    'Una idea crítica presente en obras, épocas y discursos.',
    'C',
    'green',
    'ABSTRACTION',
  ],
  [
    'MOVEMENT',
    'Movimiento',
    'Movimientos',
    'Una corriente artística y las conexiones que la definen.',
    'M',
    'violet',
    'ABSTRACTION',
  ],
  [
    'PERIOD',
    'Periodo',
    'Periodos',
    'Un marco temporal para organizar la biblioteca.',
    'P',
    'gold',
    'ABSTRACTION',
  ],
  [
    'PLACE',
    'Lugar',
    'Lugares',
    'Un lugar cultural, geográfico o institucional.',
    'L',
    'teal',
    'PLACE',
  ],
  [
    'TEXT',
    'Texto',
    'Textos',
    'Un documento, manifiesto o referencia escrita.',
    'T',
    'rose',
    'WORK',
  ],
  [
    'EVENT',
    'Evento',
    'Eventos',
    'Un acontecimiento que sitúa y conecta la cultura.',
    'E',
    'gold',
    'EVENT',
  ],
  [
    'ORGANIZATION',
    'Organización',
    'Organizaciones',
    'Una institución, colectivo o agente cultural.',
    'O',
    'violet',
    'ORGANIZATION',
  ],
] as const;

async function main() {
  for (const [
    key,
    singularName,
    pluralName,
    description,
    icon,
    colorToken,
    baseKind,
  ] of SYSTEM_ENTITY_TYPES) {
    await prisma.entityTypeDefinition.upsert({
      where: { key },
      update: {
        singularName,
        pluralName,
        description,
        icon,
        colorToken,
        baseKind,
        status: 'ACTIVE',
        systemType: true,
      },
      create: {
        id: `system-${key.toLowerCase()}`,
        key,
        singularName,
        pluralName,
        description,
        icon,
        colorToken,
        baseKind,
        status: 'ACTIVE',
        systemType: true,
      },
    });
  }
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
