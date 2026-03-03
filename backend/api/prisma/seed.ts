import 'dotenv/config';
import { PrismaClient, EntityStatus, EntityType, ContentLevel, SourceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- SOURCES (bibliografía)
  const src1 = await prisma.source.upsert({
    where: { id: 'src-demo-1' },
    update: {},
    create: {
      id: 'src-demo-1',
      type: SourceType.BOOK,
      author: 'John Berger',
      title: 'Ways of Seeing',
      publisher: 'Penguin',
      year: 1972,
      url: 'https://en.wikipedia.org/wiki/Ways_of_Seeing',
    },
  });

  const src2 = await prisma.source.upsert({
    where: { id: 'src-demo-2' },
    update: {},
    create: {
      id: 'src-demo-2',
      type: SourceType.WEBSITE,
      author: 'Museum Example',
      title: 'Artwork catalog page (example)',
      publisher: 'Museum',
      year: 2020,
      url: 'https://example.com',
    },
  });

  // --- ENTITIES
  const period = await prisma.entity.upsert({
    where: { slug: 'siglo-xx' },
    update: {},
    create: {
      type: EntityType.PERIOD,
      title: 'Siglo XX',
      slug: 'siglo-xx',
      summary: 'Periodo histórico-artístico del siglo XX.',
      content: 'Marco temporal amplio con vanguardias, rupturas estéticas y cambios sociales.',
      contentLevel: ContentLevel.BASIC,
      status: EntityStatus.PUBLISHED,
      startYear: 1901,
      endYear: 2000,
      period: {
        create: {
          definition: 'Periodo de transformaciones estéticas, tecnológicas y sociales en el arte moderno.',
        },
      },
    },
  });

  const movement = await prisma.entity.upsert({
    where: { slug: 'modernismo-demo' },
    update: {},
    create: {
      type: EntityType.MOVEMENT,
      title: 'Modernismo (demo)',
      slug: 'modernismo-demo',
      summary: 'Movimiento de referencia para pruebas.',
      content: 'Descripción breve del movimiento para fines del MVP.',
      contentLevel: ContentLevel.BASIC,
      status: EntityStatus.PUBLISHED,
    },
  });

  const conceptTime = await prisma.entity.upsert({
    where: { slug: 'tiempo' },
    update: {},
    create: {
      type: EntityType.CONCEPT,
      title: 'Tiempo',
      slug: 'tiempo',
      summary: 'Concepto abstracto relacionado con memoria, cambio y finitud.',
      contentLevel: ContentLevel.BASIC,
      status: EntityStatus.PUBLISHED,
      concept: {
        create: {
          definition: 'El tiempo como estructura narrativa, biográfica y material en la experiencia estética.',
        },
      },
    },
  });

  const artist = await prisma.entity.upsert({
    where: { slug: 'maria-godoy-demo' },
    update: {},
    create: {
      type: EntityType.ARTIST,
      title: 'María Godoy (demo)',
      slug: 'maria-godoy-demo',
      summary: 'Artista ficticia para pruebas del sistema.',
      content: 'Formación académica + desarrollo profesional (bio corta).',
      contentLevel: ContentLevel.BASIC,
      status: EntityStatus.PUBLISHED,
      startYear: 1988,
      artist: {
        create: {
          country: 'España',
          city: 'Madrid',
          birthYear: 1988,
          disciplines: 'Pintura, Instalación',
          bioShort: 'Formación en bellas artes; investigación sobre memoria y cuerpo.',
          links: 'https://example.com | https://instagram.com/example',
        },
      },
    },
  });

  // --- MEDIA (imagen principal de la obra)
  const media = await prisma.media.create({
    data: {
      url: 'https://picsum.photos/900/1200',
      alt: 'Imagen principal de la obra demo',
      source: 'picsum.photos (placeholder)',
      photoBy: 'N/A',
      license: 'Placeholder / demo',
    },
  });

  const artwork = await prisma.entity.upsert({
    where: { slug: 'obra-demo' },
    update: {},
    create: {
      type: EntityType.ARTWORK,
      title: 'Obra demo',
      slug: 'obra-demo',
      summary: 'Primera obra para validar split view + relaciones + grafo.',
      content:
        'Ensayo curatorial largo: esta obra funciona como nodo inicial para estudiar relaciones entre periodo, movimiento, concepto y autor.',
      contentLevel: ContentLevel.INTERMEDIATE,
      status: EntityStatus.PUBLISHED,
      startYear: 1956,
      endYear: 1956,

      artwork: {
        create: {
          authorNation: 'Española',
          technique: 'Óleo sobre lienzo',
          materials: 'Pigmento, barniz',
          dimensions: '90 × 120 cm',
          location: 'Museo Demo, Madrid',
          collection: 'Colección Principal (demo)',
          state: 'Restaurada (demo)',
        },
      },

      // Contributors (colaboradores)
      contributors: {
        create: [
          { name: 'Ana Pérez', role: 'curator', note: 'Curaduría general (demo)' },
          { name: 'Juan Díaz', role: 'advisor', note: 'Asesoría conceptual (demo)' },
          { name: 'Laura R.', role: 'restorer', note: 'Restauración y conservación (demo)' },
        ],
      },

      // Links media
      mediaLinks: {
        create: [{ mediaId: media.id, role: 'PRIMARY' }],
      },

      // Source refs (bibliografía)
      sourceRefs: {
        create: [
          { sourceId: src1.id, page: 'p. 12–15', quote: 'Short quote (demo)', note: 'Marco conceptual general.' },
          { sourceId: src2.id, note: 'Ficha museística (demo).' },
        ],
      },

      curatorNotes: {
        create: [{ body: 'Nota interna: revisar si añadimos “Contrasta con” en esta obra.' }],
      },
    },
  });

  // --- RELATIONS (grafo)
  // Artwork -> Artist
  await prisma.relation.create({
    data: {
      fromId: artwork.id,
      toId: artist.id,
      type: 'CREATED_BY',
      weight: 1,
      justification: 'Autoría directa.',
    },
  });

  // Artwork -> Concept
  await prisma.relation.create({
    data: {
      fromId: artwork.id,
      toId: conceptTime.id,
      type: 'REPRESENTS_CONCEPT',
      weight: 0.9,
      justification: 'El eje temático del ensayo gira en torno al tiempo.',
    },
  });

  // Artwork -> Movement
  await prisma.relation.create({
    data: {
      fromId: artwork.id,
      toId: movement.id,
      type: 'BELONGS_TO_MOVEMENT',
      weight: 0.7,
      justification: 'Rasgos formales y contexto (demo).',
    },
  });

  // Artwork -> Period
  await prisma.relation.create({
    data: {
      fromId: artwork.id,
      toId: period.id,
      type: 'BELONGS_TO_PERIOD',
      weight: 0.8,
      justification: 'Ubicación temporal (1956) dentro del siglo XX.',
    },
  });

  // Concept relations (optional demo)
  await prisma.relation.create({
    data: {
      fromId: conceptTime.id,
      toId: period.id,
      type: 'CONCEPT_RELATED_TO',
      weight: 0.4,
      justification: 'El tiempo se articula históricamente en periodos.',
    },
  });

  console.log('✅ Seed: demo dataset created');
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