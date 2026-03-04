import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

type Slugged = { id: string; slug: string };

function picsum(id: number) {
  // estable (no random) para que siempre sea la misma imagen
  return `https://picsum.photos/id/${id}/900/1200`;
}

async function main() {
  // ⚠️ Limpieza en orden (por FKs)
  await prisma.entityMedia.deleteMany();
  await prisma.sourceRef.deleteMany();
  await prisma.contributor.deleteMany();
  await prisma.relation.deleteMany();

  await prisma.curatorNote.deleteMany(); // <-- AÑADE ESTO

  await prisma.artworkDetails.deleteMany();
  await prisma.artistDetails.deleteMany();
  await prisma.conceptDetails.deleteMany();
  await prisma.periodDetails.deleteMany();

  await prisma.media.deleteMany();
  await prisma.source.deleteMany();

  await prisma.entity.deleteMany();

  // ----------------------------
  // Sources (bibliografía)
  // ----------------------------
  const src1 = await prisma.source.create({
    data: {
      id: 'src-ways-of-seeing',
      type: 'BOOK' as any,
      author: 'John Berger',
      title: 'Ways of Seeing',
      publisher: 'Penguin',
      year: 1972,
      url: 'https://en.wikipedia.org/wiki/Ways_of_Seeing',
    },
  });

  const src2 = await prisma.source.create({
    data: {
      id: 'src-museum-demo',
      type: 'WEBSITE' as any,
      author: 'Museum Example',
      title: 'Catalog entry (demo)',
      publisher: 'Museum',
      year: 2020,
      url: 'https://example.com',
    },
  });

  // ----------------------------
  // Periods
  // ----------------------------
  const periodXX = await prisma.entity.create({
    data: {
      type: 'PERIOD' as any,
      title: 'Siglo XX',
      slug: 'siglo-xx',
      summary: 'Periodo histórico-artístico del siglo XX.',
      content: 'Marco temporal amplio con vanguardias, rupturas estéticas y cambios sociales.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      startYear: 1901,
      endYear: 2000,
      period: {
        create: {
          definition: 'Periodo histórico y cultural de 1901 a 2000.',
        },
      },
    },
  });

  const periodXXI = await prisma.entity.create({
    data: {
      type: 'PERIOD' as any,
      title: 'Siglo XXI',
      slug: 'siglo-xxi',
      summary: 'Periodo contemporáneo (2001–).',
      content: 'Digitalización, globalización, nuevas formas de producción cultural.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      startYear: 2001,
      endYear: null,
      period: {
        create: {
          definition: 'Periodo contemporáneo desde 2001 hasta hoy.',
        },
      },
    },
  });

  const periodXIX = await prisma.entity.create({
    data: {
      type: 'PERIOD' as any,
      title: 'Siglo XIX',
      slug: 'siglo-xix',
      summary: 'Industrialización, romanticismo y modernidad temprana.',
      content: 'Transformaciones sociales e industriales, cambios en el arte y la política.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      startYear: 1801,
      endYear: 1900,
      period: {
        create: {
          definition: 'Periodo histórico-artístico de 1801 a 1900.',
        },
      },
    },
  });

  // ----------------------------
  // Movements
  // ----------------------------
  const modernismo = await prisma.entity.create({
    data: {
      type: 'MOVEMENT' as any,
      title: 'Modernismo (demo)',
      slug: 'modernismo-demo',
      summary: 'Movimiento de referencia para pruebas.',
      content: 'Descripción breve del movimiento para fines del MVP.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
    },
  });

  const romanticismo = await prisma.entity.create({
    data: {
      type: 'MOVEMENT' as any,
      title: 'Romanticismo (demo)',
      slug: 'romanticismo-demo',
      summary: 'Expresión emocional, subjetividad, naturaleza.',
      content: 'Movimiento cultural y artístico que enfatiza emoción y experiencia.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
    },
  });

  const contemporaneo = await prisma.entity.create({
    data: {
      type: 'MOVEMENT' as any,
      title: 'Arte contemporáneo (demo)',
      slug: 'arte-contemporaneo-demo',
      summary: 'Prácticas híbridas y experimentales.',
      content: 'Instalación, performance, digital, nuevas materialidades.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
    },
  });

  // ----------------------------
  // Concepts
  // ----------------------------
  const tiempo = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Tiempo',
      slug: 'tiempo',
      summary: 'Concepto abstracto relacionado con memoria, cambio y finitud.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Tiempo como experiencia, medida y construcción cultural.' } },
    },
  });

  const memoria = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Memoria',
      slug: 'memoria',
      summary: 'Recuerdo individual/colectivo como forma de identidad.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Memoria como archivo vivo: personal, social y simbólico.' } },
    },
  });

  const cuerpo = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Cuerpo',
      slug: 'cuerpo',
      summary: 'Materia, presencia, gesto y representación.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Cuerpo como soporte, sujeto y campo político.' } },
    },
  });

  const paisaje = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Paisaje',
      slug: 'paisaje',
      summary: 'Naturaleza como símbolo, escena o construcción cultural.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Paisaje como mirada: territorio, memoria y representación.' } },
    },
  });

  const sonido = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Sonido',
      slug: 'sonido',
      summary: 'Material invisible: ritmo, ambiente, vibración.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Sonido como experiencia espacial y temporal.' } },
    },
  });

  const identidad = await prisma.entity.create({
    data: {
      type: 'CONCEPT' as any,
      title: 'Identidad',
      slug: 'identidad',
      summary: 'Construcción simbólica: cultura, género, nación, clase.',
      contentLevel: 'BASIC' as any,
      status: 'PUBLISHED' as any,
      concept: { create: { definition: 'Identidad como proceso: narrativa, pertenencia y diferencia.' } },
    },
  });

  // relations between concepts
  await prisma.relation.createMany({
    data: [
      { fromId: memoria.id, toId: identidad.id, type: 'RELATED_TO' as any, weight: 0.8, justification: 'La memoria sostiene narrativas de identidad.' },
      { fromId: tiempo.id, toId: memoria.id, type: 'RELATED_TO' as any, weight: 0.9, justification: 'Recordar implica temporalidad.' },
      { fromId: cuerpo.id, toId: identidad.id, type: 'RELATED_TO' as any, weight: 0.7, justification: 'El cuerpo como soporte social de identidad.' },
    ],
  });

  // ----------------------------
  // Artists
  // ----------------------------
  const artists: Slugged[] = [];
  const artistData = [
    { title: 'María Godoy (demo)', slug: 'maria-godoy-demo', country: 'España', city: 'Madrid', birthYear: 1988, disciplines: 'Pintura, Instalación' },
    { title: 'Luis Ortega (demo)', slug: 'luis-ortega-demo', country: 'España', city: 'Barcelona', birthYear: 1979, disciplines: 'Fotografía' },
    { title: 'Sofía Rojas (demo)', slug: 'sofia-rojas-demo', country: 'Chile', city: 'Santiago', birthYear: 1991, disciplines: 'Arte digital, Video' },
    { title: 'Andrés Pardo (demo)', slug: 'andres-pardo-demo', country: 'Venezuela', city: 'Caracas', birthYear: 1984, disciplines: 'Escultura' },
    { title: 'Elena Vega (demo)', slug: 'elena-vega-demo', country: 'Argentina', city: 'Buenos Aires', birthYear: 1995, disciplines: 'Performance' },
  ];

  for (const a of artistData) {
    const ent = await prisma.entity.create({
      data: {
        type: 'ARTIST' as any,
        title: a.title,
        slug: a.slug,
        summary: 'Artista ficticio/a para pruebas del sistema.',
        content: 'Bio corta: formación académica + desarrollo profesional.',
        contentLevel: 'BASIC' as any,
        status: 'PUBLISHED' as any,
        startYear: a.birthYear,
        artist: {
          create: {
            country: a.country,
            city: a.city,
            birthYear: a.birthYear,
            deathYear: null,
            disciplines: a.disciplines,
            links: 'https://example.com | https://instagram.com/example',
            bioShort: 'Formación en bellas artes; investigación sobre memoria, cuerpo y territorio.',
          },
        },
      },
    });
    artists.push({ id: ent.id, slug: ent.slug });
  }

  // ----------------------------
  // Helper: create artwork with image + details + refs + contributors
  // ----------------------------
  async function createArtwork(input: {
    title: string;
    slug: string;
    year: number;
    conceptId: string;
    movementId: string;
    periodId: string;
    artistId: string;
    imgId: number;
  }) {
    const art = await prisma.entity.create({
      data: {
        type: 'ARTWORK' as any,
        title: input.title,
        slug: input.slug,
        summary: `Obra para explorar [[${input.slug}|${input.title}]] y conectar [[tiempo|Tiempo]] / [[memoria|Memoria]].`,
        content: `Ensayo: esta obra permite estudiar [[tiempo|Tiempo]] y [[memoria|Memoria]] desde una perspectiva curatorial.\n\nConecta con [[${input.movementId === modernismo.id ? 'modernismo-demo' : input.movementId === romanticismo.id ? 'romanticismo-demo' : 'arte-contemporaneo-demo'}]] y el periodo [[${input.periodId === periodXX.id ? 'siglo-xx' : input.periodId === periodXIX.id ? 'siglo-xix' : 'siglo-xxi'}]].`,
        contentLevel: 'INTERMEDIATE' as any,
        status: 'PUBLISHED' as any,
        startYear: input.year,
        endYear: input.year,

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

        contributors: {
          create: [
            { name: 'Ana Pérez', role: 'curator', note: 'Curaduría general (demo)' },
            { name: 'Juan Díaz', role: 'advisor', note: 'Asesoría conceptual (demo)' },
          ],
        },

        sourceRefs: {
          create: [
            { sourceId: src1.id, page: '12–15', quote: 'Short quote (demo)', note: 'Marco conceptual general.' },
            { sourceId: src2.id, page: null, quote: null, note: 'Ficha museística (demo).' },
          ],
        },

        mediaLinks: {
          create: [
            {
              role: 'PRIMARY' as any,
              media: {
                create: {
                  url: picsum(input.imgId),
                  kind: 'IMAGE' as any,
                  alt: `Imagen principal: ${input.title}`,
                  source: 'picsum.photos (placeholder)',
                  photoBy: 'N/A',
                  license: 'Placeholder / demo',
                },
              },
            },
          ],
        },
      },
    });

    // Relations
    await prisma.relation.createMany({
      data: [
        { fromId: art.id, toId: input.artistId, type: 'CREATED_BY' as any, weight: 1, justification: 'Autoría directa.' },
        { fromId: art.id, toId: input.conceptId, type: 'REPRESENTS_CONCEPT' as any, weight: 0.9, justification: 'Eje temático curatorial.' },
        { fromId: art.id, toId: input.movementId, type: 'BELONGS_TO_MOVEMENT' as any, weight: 0.7, justification: 'Rasgos formales y contexto.' },
        { fromId: art.id, toId: input.periodId, type: 'BELONGS_TO_PERIOD' as any, weight: 0.8, justification: 'Ubicación temporal.' },
      ],
    });

    return art;
  }

  // ----------------------------
  // Create many artworks
  // ----------------------------
  const artworksPlan = [
    { title: 'Obra demo', slug: 'obra-demo', year: 1956, conceptId: tiempo.id, movementId: modernismo.id, periodId: periodXX.id, artistId: artists[0].id, imgId: 1015 },
    { title: 'Archivo de niebla', slug: 'archivo-de-niebla', year: 1959, conceptId: memoria.id, movementId: modernismo.id, periodId: periodXX.id, artistId: artists[1].id, imgId: 1025 },
    { title: 'Cuerpo y huella', slug: 'cuerpo-y-huella', year: 1963, conceptId: cuerpo.id, movementId: modernismo.id, periodId: periodXX.id, artistId: artists[3].id, imgId: 1035 },
    { title: 'Paisaje detenido', slug: 'paisaje-detenido', year: 1887, conceptId: paisaje.id, movementId: romanticismo.id, periodId: periodXIX.id, artistId: artists[2].id, imgId: 1043 },
    { title: 'Ritmo de ciudad', slug: 'ritmo-de-ciudad', year: 2009, conceptId: sonido.id, movementId: contemporaneo.id, periodId: periodXXI.id, artistId: artists[2].id, imgId: 1050 },
    { title: 'Identidad fragmentada', slug: 'identidad-fragmentada', year: 2014, conceptId: identidad.id, movementId: contemporaneo.id, periodId: periodXXI.id, artistId: artists[4].id, imgId: 1060 },
    { title: 'Tiempo circular', slug: 'tiempo-circular', year: 1974, conceptId: tiempo.id, movementId: modernismo.id, periodId: periodXX.id, artistId: artists[0].id, imgId: 1069 },
    { title: 'Memoria de piedra', slug: 'memoria-de-piedra', year: 1981, conceptId: memoria.id, movementId: modernismo.id, periodId: periodXX.id, artistId: artists[3].id, imgId: 1074 },
    { title: 'Cuerpo político', slug: 'cuerpo-politico', year: 2019, conceptId: cuerpo.id, movementId: contemporaneo.id, periodId: periodXXI.id, artistId: artists[4].id, imgId: 1084 },
    { title: 'Paisaje como mito', slug: 'paisaje-como-mito', year: 1869, conceptId: paisaje.id, movementId: romanticismo.id, periodId: periodXIX.id, artistId: artists[1].id, imgId: 1080 },
    { title: 'Sonido del vacío', slug: 'sonido-del-vacio', year: 2021, conceptId: sonido.id, movementId: contemporaneo.id, periodId: periodXXI.id, artistId: artists[2].id, imgId: 1081 },
    { title: 'Máscara e identidad', slug: 'mascara-e-identidad', year: 2004, conceptId: identidad.id, movementId: contemporaneo.id, periodId: periodXXI.id, artistId: artists[4].id, imgId: 1082 },
  ];

  for (const a of artworksPlan) {
    await createArtwork(a);
  }

  console.log('✅ Seed: created periods, movements, concepts, artists and 12 artworks with images + relations.');
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