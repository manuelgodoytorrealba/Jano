import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type BaseEntity = { id: string; slug: string; title: string };

type CreateEntityWithMediaInput = {
  type: 'ARTWORK' | 'ARTIST' | 'MOVEMENT' | 'PERIOD' | 'CONCEPT' | 'PLACE';
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  contentLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  startYear?: number | null;
  endYear?: number | null;
  media?: {
    url: string;
    alt?: string;
    source?: string;
    photoBy?: string;
    license?: string;
  };
};

async function resetDatabase() {
  await prisma.collectionEntity.deleteMany();
  await prisma.savedEntity.deleteMany();

  await prisma.entityMedia.deleteMany();
  await prisma.sourceRef.deleteMany();
  await prisma.contributor.deleteMany();
  await prisma.curatorNote.deleteMany();
  await prisma.relation.deleteMany();

  await prisma.artworkDetails.deleteMany();
  await prisma.artistDetails.deleteMany();
  await prisma.conceptDetails.deleteMany();
  await prisma.periodDetails.deleteMany();

  await prisma.collection.deleteMany();

  await prisma.media.deleteMany();
  await prisma.source.deleteMany();

  await prisma.entity.deleteMany();
}

async function createEntityWithOptionalPrimaryMedia(
  input: CreateEntityWithMediaInput,
): Promise<BaseEntity> {
  const entity = await prisma.entity.create({
    data: {
      type: input.type,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      content: input.content,
      contentLevel: input.contentLevel ?? 'BASIC',
      status: input.status ?? 'PUBLISHED',
      startYear: input.startYear ?? null,
      endYear: input.endYear ?? null,
    },
  });

  if (input.media) {
    const media = await prisma.media.create({
      data: {
        url: input.media.url,
        kind: 'IMAGE',
        alt: input.media.alt,
        source: input.media.source,
        photoBy: input.media.photoBy,
        license: input.media.license,
      },
    });

    await prisma.entityMedia.create({
      data: {
        entityId: entity.id,
        mediaId: media.id,
        role: 'PRIMARY',
      },
    });
  }

  return { id: entity.id, slug: entity.slug, title: entity.title };
}

async function rel(
  fromId: string,
  toId: string,
  type: string,
  weight?: number,
  justification?: string,
) {
  return prisma.relation.create({
    data: {
      fromId,
      toId,
      type,
      weight,
      justification,
    },
  });
}

async function main() {
  console.log('🧹 Resetting demo data...');
  await resetDatabase();

  console.log('📚 Creating sources...');

  const srcPrado = await prisma.source.create({
    data: {
      type: 'WEBSITE',
      author: 'Museo Nacional del Prado',
      title: 'Colección del Museo del Prado',
      publisher: 'Museo del Prado',
      year: 2026,
      url: 'https://www.museodelprado.es',
    },
  });

  const srcReinaSofia = await prisma.source.create({
    data: {
      type: 'WEBSITE',
      author: 'Museo Nacional Centro de Arte Reina Sofía',
      title: 'Colección del Museo Reina Sofía',
      publisher: 'Museo Reina Sofía',
      year: 2026,
      url: 'https://www.museoreinasofia.es',
    },
  });

  const srcMoma = await prisma.source.create({
    data: {
      type: 'WEBSITE',
      author: 'The Museum of Modern Art',
      title: 'MoMA Collection',
      publisher: 'MoMA',
      year: 2026,
      url: 'https://www.moma.org',
    },
  });

  const srcFridaMuseum = await prisma.source.create({
    data: {
      type: 'WEBSITE',
      author: 'Museo de Arte Moderno / referencias museísticas',
      title: 'Frida Kahlo references',
      publisher: 'Museum references',
      year: 2026,
      url: 'https://www.moma.org/artists/2963',
    },
  });

  const srcTate = await prisma.source.create({
    data: {
      type: 'WEBSITE',
      author: 'Tate',
      title: 'Louise Bourgeois overview',
      publisher: 'Tate',
      year: 2026,
      url: 'https://www.tate.org.uk',
    },
  });

  console.log('🕰 Creating periods...');

  const periodXIX = await createEntityWithOptionalPrimaryMedia({
    type: 'PERIOD',
    title: 'Siglo XIX',
    slug: 'siglo-xix',
    summary: 'Periodo histórico-artístico entre 1801 y 1900.',
    content:
      'Periodo marcado por transformaciones políticas, industrialización, romanticismo, realismo y el surgimiento de nuevas sensibilidades modernas.',
    startYear: 1801,
    endYear: 1900,
  });

  await prisma.periodDetails.create({
    data: {
      entityId: periodXIX.id,
      definition:
        'Periodo histórico y cultural comprendido entre 1801 y 1900.',
    },
  });

  const periodXX = await createEntityWithOptionalPrimaryMedia({
    type: 'PERIOD',
    title: 'Siglo XX',
    slug: 'siglo-xx',
    summary: 'Periodo central para las vanguardias y el arte moderno.',
    content:
      'El siglo XX concentra vanguardias históricas, guerras mundiales, transformaciones tecnológicas y nuevas formas radicales de representación.',
    startYear: 1901,
    endYear: 2000,
  });

  await prisma.periodDetails.create({
    data: {
      entityId: periodXX.id,
      definition:
        'Periodo histórico y cultural comprendido entre 1901 y 2000.',
    },
  });

  const periodXXI = await createEntityWithOptionalPrimaryMedia({
    type: 'PERIOD',
    title: 'Siglo XXI',
    slug: 'siglo-xxi',
    summary: 'Periodo contemporáneo global y digital.',
    content:
      'Periodo marcado por redes, digitalización, circulación global de imágenes y nuevos modelos de producción cultural.',
    startYear: 2001,
    endYear: null,
  });

  await prisma.periodDetails.create({
    data: {
      entityId: periodXXI.id,
      definition: 'Periodo contemporáneo desde 2001 hasta la actualidad.',
    },
  });

  console.log('🎨 Creating movements...');

  const romanticismo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Romanticismo',
    slug: 'romanticismo',
    summary:
      'Movimiento que enfatiza emoción, subjetividad, intensidad y experiencia histórica.',
    content:
      'El Romanticismo privilegia la emoción, la imaginación, lo sublime, el dramatismo y una relación intensa entre arte, historia y experiencia humana.',
  });

  const cubismo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Cubismo',
    slug: 'cubismo',
    summary:
      'Movimiento de vanguardia que fragmenta y reorganiza la representación.',
    content:
      'El Cubismo reformula la representación mediante la fragmentación del plano y la multiplicidad de puntos de vista.',
  });

  const surrealismo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Surrealismo',
    slug: 'surrealismo',
    summary:
      'Movimiento que explora sueño, subconsciente, deseo e irracionalidad.',
    content:
      'El Surrealismo explora asociaciones libres, imágenes oníricas y relaciones inesperadas entre objetos, tiempo y memoria.',
  });

  const arteModerno = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Arte moderno',
    slug: 'arte-moderno',
    summary:
      'Conjunto amplio de prácticas artísticas que redefinen la modernidad visual.',
    content:
      'El arte moderno reúne procesos de ruptura formal, experimentación material y nuevas formas de ver el mundo.',
  });

  const arteContemporaneo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Arte contemporáneo',
    slug: 'arte-contemporaneo',
    summary:
      'Prácticas artísticas contemporáneas, híbridas y conceptuales.',
    content:
      'El arte contemporáneo incorpora instalación, performance, escultura expandida, crítica institucional y una fuerte dimensión conceptual.',
  });

  console.log('💡 Creating concepts...');

  const tiempo = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Tiempo',
    slug: 'tiempo',
    summary: 'Duración, cambio, memoria y finitud.',
    content:
      'El tiempo en arte puede aparecer como duración, ruina, repetición, espera, simultaneidad o memoria materializada.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: tiempo.id,
      definition:
        'Concepto que remite a duración, cambio, pasado, presente, futuro y experiencia histórica.',
    },
  });

  const memoria = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Memoria',
    slug: 'memoria',
    summary: 'Recuerdo individual y colectivo, archivo y huella.',
    content:
      'La memoria articula identidad, historia, trauma, archivo y persistencia de imágenes o experiencias.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: memoria.id,
      definition:
        'Concepto ligado al recuerdo, la identidad, el archivo y la construcción del pasado.',
    },
  });

  const guerra = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Guerra',
    slug: 'guerra',
    summary: 'Violencia organizada, conflicto histórico y devastación.',
    content:
      'La guerra aparece en el arte como trauma, denuncia, destrucción, heroísmo, sufrimiento o memoria política.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: guerra.id,
      definition:
        'Concepto asociado a conflicto armado, violencia, trauma y memoria histórica.',
    },
  });

  const identidad = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Identidad',
    slug: 'identidad',
    summary: 'Construcción simbólica del yo, el cuerpo y la pertenencia.',
    content:
      'La identidad atraviesa autorrepresentación, género, nación, memoria personal y representación del cuerpo.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: identidad.id,
      definition:
        'Concepto asociado a subjetividad, autorrepresentación, pertenencia y diferencia.',
    },
  });

  const cuerpo = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Cuerpo',
    slug: 'cuerpo',
    summary: 'Presencia material, gesto, vulnerabilidad y representación.',
    content:
      'El cuerpo es soporte, materia, símbolo, territorio político y forma de presencia en el espacio.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: cuerpo.id,
      definition:
        'Concepto ligado a materia viva, representación, presencia física y dimensión política.',
    },
  });

  const dolor = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Dolor',
    slug: 'dolor',
    summary: 'Sufrimiento físico, emocional y simbólico.',
    content:
      'El dolor en arte se vincula con trauma, pérdida, vulnerabilidad, enfermedad y resistencia.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: dolor.id,
      definition:
        'Concepto que remite a sufrimiento, herida, pérdida y experiencia vulnerable.',
    },
  });

  const maternidad = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Maternidad',
    slug: 'maternidad',
    summary: 'Vínculo, cuidado, origen, ambivalencia y memoria afectiva.',
    content:
      'La maternidad puede aparecer como origen, protección, tensión afectiva, cuerpo compartido o ambivalencia emocional.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: maternidad.id,
      definition:
        'Concepto asociado a cuidado, origen, vínculo afectivo y dimensión simbólica de lo materno.',
    },
  });

  const violencia = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Violencia',
    slug: 'violencia',
    summary: 'Daño físico, simbólico, social o histórico.',
    content:
      'La violencia en arte puede manifestarse como agresión, trauma, imposición, ruptura o denuncia visual.',
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: violencia.id,
      definition:
        'Concepto asociado a daño, imposición, trauma, ruptura y conflicto.',
    },
  });

  console.log('📍 Creating places...');

  const prado = await createEntityWithOptionalPrimaryMedia({
    type: 'PLACE',
    title: 'Museo del Prado',
    slug: 'museo-del-prado',
    summary: 'Museo nacional de arte ubicado en Madrid.',
    content:
      'Institución central para la historia del arte europeo y español, con una de las colecciones más importantes del mundo.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Museo_del_Prado_2016_%28cropped%29.jpg',
      alt: 'Fachada del Museo del Prado en Madrid',
      source: 'Wikimedia Commons',
      photoBy: 'Zarateman',
      license: 'CC BY-SA 4.0',
    },
  });

  const reinaSofia = await createEntityWithOptionalPrimaryMedia({
    type: 'PLACE',
    title: 'Museo Reina Sofía',
    slug: 'museo-reina-sofia',
    summary: 'Museo nacional de arte moderno y contemporáneo en Madrid.',
    content:
      'Institución clave para el estudio del arte moderno y contemporáneo en España.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/02/MNCARS_entrada_principal.jpg',
      alt: 'Entrada principal del Museo Reina Sofía',
      source: 'Wikimedia Commons',
      photoBy: 'Luis García',
      license: 'CC BY-SA 3.0',
    },
  });

  const moma = await createEntityWithOptionalPrimaryMedia({
    type: 'PLACE',
    title: 'MoMA',
    slug: 'moma',
    summary: 'Museum of Modern Art de Nueva York.',
    content:
      'Museo central para el estudio del arte moderno y contemporáneo internacional.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Museum_of_Modern_Art_%28New_York_City%29_logo.svg',
      alt: 'Identidad visual del Museum of Modern Art',
      source: 'Wikimedia Commons',
      photoBy: 'MoMA',
      license: 'Uso informativo / referencia visual',
    },
  });

  const guggenheimBilbao = await createEntityWithOptionalPrimaryMedia({
    type: 'PLACE',
    title: 'Guggenheim Bilbao',
    slug: 'guggenheim-bilbao',
    summary: 'Museo de arte contemporáneo ubicado en Bilbao.',
    content:
      'Museo internacionalmente reconocido por su arquitectura y su colección de arte contemporáneo.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Guggenheim_Bilbao_Museoa.jpg',
      alt: 'Vista exterior del Guggenheim Bilbao',
      source: 'Wikimedia Commons',
      photoBy: 'Francisco Anzola',
      license: 'CC BY 2.0',
    },
  });

  console.log('🧑‍🎨 Creating artists...');

  const goya = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTIST',
    title: 'Francisco de Goya',
    slug: 'francisco-de-goya',
    summary:
      'Pintor y grabador español fundamental para la transición entre Antiguo Régimen y modernidad.',
    content:
      'Francisco de Goya fue uno de los artistas más influyentes de la historia del arte español. Su obra recorre retrato, pintura histórica, crítica social, violencia y visiones oscuras del ser humano.',
    startYear: 1746,
    endYear: 1828,
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Francisco_de_Goya_y_Lucientes.jpg',
      alt: 'Retrato de Francisco de Goya',
      source: 'Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
  });

  await prisma.artistDetails.create({
    data: {
      entityId: goya.id,
      country: 'España',
      city: 'Fuendetodos',
      birthYear: 1746,
      deathYear: 1828,
      disciplines: 'Pintura, Grabado',
      bioShort:
        'Artista clave de la pintura española, célebre por su potencia crítica, expresiva y visionaria.',
      links: 'https://www.museodelprado.es',
    },
  });

  const picasso = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTIST',
    title: 'Pablo Picasso',
    slug: 'pablo-picasso',
    summary:
      'Pintor, escultor y creador español, figura central del arte del siglo XX.',
    content:
      'Pablo Picasso fue una figura decisiva del arte moderno. Su obra abarca pintura, escultura, grabado y experimentación formal, con un papel esencial en el Cubismo.',
    startYear: 1881,
    endYear: 1973,
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Pablo_picasso_1.jpg',
      alt: 'Retrato de Pablo Picasso',
      source: 'Wikimedia Commons',
      photoBy: 'Anefo',
      license: 'CC0 / public domain mark',
    },
  });

  await prisma.artistDetails.create({
    data: {
      entityId: picasso.id,
      country: 'España',
      city: 'Málaga',
      birthYear: 1881,
      deathYear: 1973,
      disciplines: 'Pintura, Escultura, Grabado',
      bioShort:
        'Figura central de la vanguardia del siglo XX y cofundador del Cubismo.',
      links: 'https://www.museoreinasofia.es',
    },
  });

  const dali = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTIST',
    title: 'Salvador Dalí',
    slug: 'salvador-dali',
    summary:
      'Artista español asociado al Surrealismo y a la exploración de imágenes oníricas.',
    content:
      'Salvador Dalí desarrolló una obra intensamente reconocible, marcada por imágenes de sueño, asociaciones insólitas y reflexiones visuales sobre el tiempo y el deseo.',
    startYear: 1904,
    endYear: 1989,
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Salvador_Dal%C3%AD_1939.jpg',
      alt: 'Retrato de Salvador Dalí en 1939',
      source: 'Wikimedia Commons',
      photoBy: 'Carl Van Vechten',
      license: 'Public domain',
    },
  });

  await prisma.artistDetails.create({
    data: {
      entityId: dali.id,
      country: 'España',
      city: 'Figueres',
      birthYear: 1904,
      deathYear: 1989,
      disciplines: 'Pintura, Dibujo, Escultura, Diseño',
      bioShort:
        'Uno de los artistas más reconocibles del Surrealismo, célebre por sus imágenes oníricas y simbólicas.',
      links: 'https://www.moma.org',
    },
  });

  const frida = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTIST',
    title: 'Frida Kahlo',
    slug: 'frida-kahlo',
    summary:
      'Pintora mexicana conocida por sus autorrepresentaciones y su exploración de identidad, dolor y cuerpo.',
    content:
      'Frida Kahlo convirtió la experiencia personal, corporal y afectiva en una forma poderosa de representación artística. Su obra se vincula con identidad, dolor, memoria y autorrepresentación.',
    startYear: 1907,
    endYear: 1954,
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
      alt: 'Retrato de Frida Kahlo',
      source: 'Wikimedia Commons',
      photoBy: 'Guillermo Kahlo',
      license: 'Public domain',
    },
  });

  await prisma.artistDetails.create({
    data: {
      entityId: frida.id,
      country: 'México',
      city: 'Coyoacán',
      birthYear: 1907,
      deathYear: 1954,
      disciplines: 'Pintura',
      bioShort:
        'Artista clave del siglo XX cuya obra convierte la experiencia personal y corporal en lenguaje visual.',
      links: 'https://www.moma.org/artists/2963',
    },
  });

  const bourgeois = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTIST',
    title: 'Louise Bourgeois',
    slug: 'louise-bourgeois',
    summary:
      'Artista franco-estadounidense fundamental para la escultura y el arte contemporáneo.',
    content:
      'Louise Bourgeois desarrolló una obra de enorme intensidad psicológica, vinculada a memoria, cuerpo, maternidad, dolor y espacio escultórico.',
    startYear: 1911,
    endYear: 2010,
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Louise_Bourgeois%2C_1997.jpg',
      alt: 'Retrato de Louise Bourgeois',
      source: 'Wikimedia Commons',
      photoBy: 'Christopher Lyon',
      license: 'CC BY-SA 3.0',
    },
  });

  await prisma.artistDetails.create({
    data: {
      entityId: bourgeois.id,
      country: 'Francia / Estados Unidos',
      city: 'Paris',
      birthYear: 1911,
      deathYear: 2010,
      disciplines: 'Escultura, Instalación, Dibujo',
      bioShort:
        'Escultora fundamental del arte contemporáneo, asociada a memoria, cuerpo y maternidad.',
      links: 'https://www.tate.org.uk/art/artists/louise-bourgeois-2351',
    },
  });

  console.log('🖼 Creating artworks...');

  const saturno = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'Saturno devorando a su hijo',
    slug: 'saturno-devorando-a-su-hijo',
    summary:
      'Una de las Pinturas negras de Goya, marcada por violencia, oscuridad y potencia expresiva.',
    content:
      'Esta obra de Francisco de Goya condensa violencia, tiempo, destrucción y una visión extrema de la condición humana. Puede conectarse con [[violencia]], [[tiempo]] y [[dolor]].',
    startYear: 1820,
    endYear: 1823,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg',
      alt: 'Saturno devorando a su hijo de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: saturno.id,
      authorNation: 'Española',
      technique: 'Óleo trasladado a lienzo',
      materials: 'Óleo',
      dimensions: '143.5 × 81.4 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Pinturas negras',
      state: 'Conservada',
    },
  });

  const tresDeMayo = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'El tres de mayo de 1808',
    slug: 'el-tres-de-mayo-de-1808',
    summary:
      'Pintura histórica de Goya sobre la violencia de la guerra y la ejecución.',
    content:
      'Obra central para pensar [[guerra]], [[violencia]] y memoria histórica. Su dramatismo visual y su dimensión política la convierten en una imagen decisiva de la modernidad.',
    startYear: 1814,
    endYear: 1814,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Goya_-_The_Third_of_May_1808_in_Madrid.jpg',
      alt: 'El tres de mayo de 1808 de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: tresDeMayo.id,
      authorNation: 'Española',
      technique: 'Óleo sobre lienzo',
      materials: 'Óleo',
      dimensions: '268 × 347 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Colección permanente',
      state: 'Conservada',
    },
  });

  const guernica = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'Guernica',
    slug: 'guernica',
    summary:
      'Obra monumental de Picasso sobre el horror del bombardeo y la violencia de la guerra.',
    content:
      '[[Guernica]] articula una reflexión visual sobre [[guerra]], [[violencia]] y memoria histórica. También conecta con la fragmentación formal del [[cubismo]].',
    startYear: 1937,
    endYear: 1937,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      alt: 'Guernica de Pablo Picasso',
      source: 'Museo Reina Sofía / referencia visual',
      photoBy: 'Pablo Picasso',
      license: 'Uso informativo / referencia visual',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: guernica.id,
      authorNation: 'Española',
      technique: 'Óleo sobre lienzo',
      materials: 'Óleo',
      dimensions: '349.3 × 776.6 cm',
      location: 'Museo Reina Sofía, Madrid',
      collection: 'Colección permanente',
      state: 'Conservada',
    },
  });

  const persistencia = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'La persistencia de la memoria',
    slug: 'la-persistencia-de-la-memoria',
    summary:
      'Obra icónica de Dalí sobre tiempo, sueño, inestabilidad y percepción.',
    content:
      'Esta obra se conecta directamente con [[tiempo]] y [[memoria]], y también con el imaginario del [[surrealismo]].',
    startYear: 1931,
    endYear: 1931,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      alt: 'La persistencia de la memoria de Salvador Dalí',
      source: 'MoMA / referencia visual',
      photoBy: 'Salvador Dalí',
      license: 'Uso informativo / referencia visual',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: persistencia.id,
      authorNation: 'Española',
      technique: 'Óleo sobre lienzo',
      materials: 'Óleo',
      dimensions: '24 × 33 cm',
      location: 'MoMA, New York',
      collection: 'Colección permanente',
      state: 'Conservada',
    },
  });

  const dosFridas = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'Las dos Fridas',
    slug: 'las-dos-fridas',
    summary:
      'Doble autorrepresentación de Frida Kahlo vinculada a identidad, cuerpo y dolor.',
    content:
      'Obra clave para pensar [[identidad]], [[cuerpo]] y [[dolor]] desde la autorrepresentación. También puede leerse desde memoria afectiva y escisión interior.',
    startYear: 1939,
    endYear: 1939,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Frida_Kahlo_%28Las_dos_Fridas%29.jpg',
      alt: 'Las dos Fridas de Frida Kahlo',
      source: 'Wikimedia Commons',
      photoBy: 'Dominio público / referencia visual',
      license: 'Public domain / educational reference',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: dosFridas.id,
      authorNation: 'Mexicana',
      technique: 'Óleo sobre lienzo',
      materials: 'Óleo',
      dimensions: '173 × 173 cm',
      location: 'Museo de Arte Moderno, Ciudad de México',
      collection: 'Colección permanente',
      state: 'Conservada',
    },
  });

  const maman = await createEntityWithOptionalPrimaryMedia({
    type: 'ARTWORK',
    title: 'Maman',
    slug: 'maman',
    summary:
      'Escultura monumental de Louise Bourgeois asociada a maternidad, memoria y ambivalencia afectiva.',
    content:
      '[[Maman]] conecta con [[maternidad]], [[memoria]] y [[cuerpo]]. Su escala monumental intensifica su lectura emocional y espacial.',
    startYear: 1999,
    endYear: 1999,
    contentLevel: 'INTERMEDIATE',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Maman.jpg',
      alt: 'Maman de Louise Bourgeois',
      source: 'Wikimedia Commons',
      photoBy: 'Jorge Láscar',
      license: 'CC BY 2.0',
    },
  });

  await prisma.artworkDetails.create({
    data: {
      entityId: maman.id,
      authorNation: 'Franco-estadounidense',
      technique: 'Escultura monumental',
      materials: 'Bronce, acero inoxidable y mármol',
      dimensions: 'aprox. 927 × 891 × 1024 cm',
      location: 'Guggenheim Bilbao',
      collection: 'Instalación / colección vinculada',
      state: 'Conservada',
    },
  });

  console.log('🔗 Creating source refs...');

  const sourceRefsData = [
    { entityId: goya.id, sourceId: srcPrado.id, note: 'Referencia institucional principal.' },
    { entityId: saturno.id, sourceId: srcPrado.id, note: 'Ficha institucional de obra.' },
    { entityId: tresDeMayo.id, sourceId: srcPrado.id, note: 'Ficha institucional de obra.' },

    { entityId: picasso.id, sourceId: srcReinaSofia.id, note: 'Referencia institucional principal.' },
    { entityId: guernica.id, sourceId: srcReinaSofia.id, note: 'Ficha institucional de obra.' },

    { entityId: dali.id, sourceId: srcMoma.id, note: 'Referencia institucional principal.' },
    { entityId: persistencia.id, sourceId: srcMoma.id, note: 'Ficha institucional de obra.' },

    { entityId: frida.id, sourceId: srcFridaMuseum.id, note: 'Referencia museística.' },
    { entityId: dosFridas.id, sourceId: srcFridaMuseum.id, note: 'Referencia contextual de artista/obra.' },

    { entityId: bourgeois.id, sourceId: srcTate.id, note: 'Referencia institucional/contextual.' },
    { entityId: maman.id, sourceId: srcTate.id, note: 'Referencia contextual sobre la artista y su obra.' },
  ];

  for (const ref of sourceRefsData) {
    await prisma.sourceRef.create({ data: ref });
  }

  console.log('🧠 Creating semantic relations...');

  // Concept to concept
  await rel(memoria.id, identidad.id, 'RELATED_TO', 0.85, 'La memoria participa en la construcción de identidad.');
  await rel(tiempo.id, memoria.id, 'RELATED_TO', 0.95, 'La experiencia de la memoria está ligada a la temporalidad.');
  await rel(cuerpo.id, identidad.id, 'RELATED_TO', 0.85, 'El cuerpo es una dimensión clave de la identidad.');
  await rel(dolor.id, cuerpo.id, 'RELATED_TO', 0.8, 'El dolor se experimenta a través del cuerpo.');
  await rel(maternidad.id, memoria.id, 'RELATED_TO', 0.75, 'La maternidad puede articular memoria afectiva y simbólica.');
  await rel(guerra.id, violencia.id, 'RELATED_TO', 0.95, 'La guerra es una forma histórica de violencia.');

  // Artists to movements
  await rel(goya.id, romanticismo.id, 'ASSOCIATED_WITH', 0.7, 'Goya es una figura fundamental en los orígenes de la sensibilidad moderna y romántica.');
  await rel(picasso.id, cubismo.id, 'BELONGS_TO_MOVEMENT', 1, 'Picasso es cofundador del Cubismo.');
  await rel(dali.id, surrealismo.id, 'BELONGS_TO_MOVEMENT', 1, 'Dalí es una figura clave del Surrealismo.');
  await rel(frida.id, arteModerno.id, 'ASSOCIATED_WITH', 0.75, 'Frida Kahlo se estudia dentro del arte moderno del siglo XX.');
  await rel(bourgeois.id, arteContemporaneo.id, 'ASSOCIATED_WITH', 0.9, 'Louise Bourgeois es central para el arte contemporáneo.');

  // Artists to periods
  await rel(goya.id, periodXIX.id, 'BELONGS_TO_PERIOD', 0.9, 'Goya pertenece históricamente a finales del XVIII y comienzos del XIX.');
  await rel(picasso.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Picasso es central para el arte del siglo XX.');
  await rel(dali.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Dalí pertenece al siglo XX.');
  await rel(frida.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Frida Kahlo pertenece al siglo XX.');
  await rel(bourgeois.id, periodXX.id, 'BELONGS_TO_PERIOD', 0.9, 'La trayectoria de Bourgeois se desarrolla principalmente en el siglo XX.');

  // Artists to concepts
  await rel(frida.id, identidad.id, 'ASSOCIATED_WITH', 0.95, 'La identidad es central en la obra de Frida Kahlo.');
  await rel(frida.id, cuerpo.id, 'ASSOCIATED_WITH', 0.95, 'El cuerpo es central en la obra de Frida Kahlo.');
  await rel(frida.id, dolor.id, 'ASSOCIATED_WITH', 0.95, 'El dolor es un eje clave en la obra de Frida Kahlo.');

  await rel(bourgeois.id, memoria.id, 'ASSOCIATED_WITH', 0.95, 'La memoria es una dimensión fundamental en la obra de Bourgeois.');
  await rel(bourgeois.id, maternidad.id, 'ASSOCIATED_WITH', 0.95, 'La maternidad es un eje conceptual importante en Bourgeois.');
  await rel(bourgeois.id, cuerpo.id, 'ASSOCIATED_WITH', 0.85, 'El cuerpo atraviesa la obra escultórica de Bourgeois.');

  await rel(dali.id, tiempo.id, 'ASSOCIATED_WITH', 0.9, 'La temporalidad es un tema central en la obra de Dalí.');
  await rel(dali.id, memoria.id, 'ASSOCIATED_WITH', 0.75, 'La memoria y las imágenes psíquicas tienen peso en Dalí.');

  await rel(goya.id, violencia.id, 'ASSOCIATED_WITH', 0.85, 'Goya aborda la violencia histórica y humana.');
  await rel(goya.id, guerra.id, 'ASSOCIATED_WITH', 0.85, 'Goya representa la guerra con intensidad crítica.');

  await rel(picasso.id, guerra.id, 'ASSOCIATED_WITH', 0.9, 'La guerra es un eje central en Guernica.');
  await rel(picasso.id, violencia.id, 'ASSOCIATED_WITH', 0.85, 'Picasso tematiza la violencia política en obras clave.');

  // Artworks to artists
  await rel(saturno.id, goya.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(tresDeMayo.id, goya.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(guernica.id, picasso.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(persistencia.id, dali.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(dosFridas.id, frida.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(maman.id, bourgeois.id, 'CREATED_BY', 1, 'Autoría directa.');

  // Artworks to movements
  await rel(saturno.id, romanticismo.id, 'BELONGS_TO_MOVEMENT', 0.7, 'Obra asociada a la sensibilidad romántica y premoderna.');
  await rel(tresDeMayo.id, romanticismo.id, 'BELONGS_TO_MOVEMENT', 0.85, 'Obra clave del dramatismo histórico romántico.');
  await rel(guernica.id, cubismo.id, 'BELONGS_TO_MOVEMENT', 0.85, 'La fragmentación formal se vincula al lenguaje cubista.');
  await rel(persistencia.id, surrealismo.id, 'BELONGS_TO_MOVEMENT', 1, 'Obra emblemática del Surrealismo.');
  await rel(dosFridas.id, arteModerno.id, 'BELONGS_TO_MOVEMENT', 0.75, 'Se estudia dentro de los lenguajes del arte moderno del siglo XX.');
  await rel(maman.id, arteContemporaneo.id, 'BELONGS_TO_MOVEMENT', 0.95, 'Escultura central del arte contemporáneo.');

  // Artworks to periods
  await rel(saturno.id, periodXIX.id, 'BELONGS_TO_PERIOD', 0.95, 'Obra de comienzos del siglo XIX.');
  await rel(tresDeMayo.id, periodXIX.id, 'BELONGS_TO_PERIOD', 1, 'Obra de 1814.');
  await rel(guernica.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Obra de 1937.');
  await rel(persistencia.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Obra de 1931.');
  await rel(dosFridas.id, periodXX.id, 'BELONGS_TO_PERIOD', 1, 'Obra de 1939.');
  await rel(maman.id, periodXX.id, 'BELONGS_TO_PERIOD', 0.95, 'Obra de 1999.');

  // Artworks to concepts
  await rel(saturno.id, violencia.id, 'ABOUT_CONCEPT', 0.95, 'La obra expresa una violencia radical.');
  await rel(saturno.id, tiempo.id, 'ABOUT_CONCEPT', 0.7, 'Puede leerse desde la destrucción y el tiempo devorador.');
  await rel(saturno.id, dolor.id, 'ABOUT_CONCEPT', 0.7, 'La intensidad emocional remite al dolor.');

  await rel(tresDeMayo.id, guerra.id, 'ABOUT_CONCEPT', 1, 'La obra representa la guerra y la ejecución.');
  await rel(tresDeMayo.id, violencia.id, 'ABOUT_CONCEPT', 1, 'La violencia es explícita y central.');
  await rel(tresDeMayo.id, memoria.id, 'ABOUT_CONCEPT', 0.75, 'También puede leerse como memoria histórica.');

  await rel(guernica.id, guerra.id, 'ABOUT_CONCEPT', 1, 'La guerra es el eje central de la obra.');
  await rel(guernica.id, violencia.id, 'ABOUT_CONCEPT', 1, 'La violencia atraviesa la composición.');
  await rel(guernica.id, memoria.id, 'ABOUT_CONCEPT', 0.8, 'La obra opera como memoria histórica del bombardeo.');

  await rel(persistencia.id, tiempo.id, 'ABOUT_CONCEPT', 1, 'La obra es emblemática para pensar el tiempo.');
  await rel(persistencia.id, memoria.id, 'ABOUT_CONCEPT', 0.9, 'El título y la imagen remiten a memoria y persistencia.');

  await rel(dosFridas.id, identidad.id, 'ABOUT_CONCEPT', 1, 'La identidad es uno de los ejes más evidentes.');
  await rel(dosFridas.id, cuerpo.id, 'ABOUT_CONCEPT', 0.95, 'La representación corporal es central.');
  await rel(dosFridas.id, dolor.id, 'ABOUT_CONCEPT', 0.9, 'La herida y el sufrimiento son visibles.');

  await rel(maman.id, maternidad.id, 'ABOUT_CONCEPT', 1, 'La obra está profundamente ligada a lo materno.');
  await rel(maman.id, memoria.id, 'ABOUT_CONCEPT', 0.9, 'La memoria afectiva es central en la lectura de la obra.');
  await rel(maman.id, cuerpo.id, 'ABOUT_CONCEPT', 0.7, 'La monumentalidad corporal de la escultura lo sugiere.');

  // Artworks to places
  await rel(saturno.id, prado.id, 'LOCATED_IN', 1, 'La obra se encuentra en el Museo del Prado.');
  await rel(tresDeMayo.id, prado.id, 'LOCATED_IN', 1, 'La obra se encuentra en el Museo del Prado.');
  await rel(guernica.id, reinaSofia.id, 'LOCATED_IN', 1, 'La obra se encuentra en el Museo Reina Sofía.');
  await rel(persistencia.id, moma.id, 'LOCATED_IN', 1, 'La obra se encuentra en el MoMA.');
  await rel(maman.id, guggenheimBilbao.id, 'LOCATED_IN', 0.9, 'Existe una versión/instalación emblemática asociada a Guggenheim Bilbao.');

  // Related artworks
  await rel(guernica.id, tresDeMayo.id, 'RELATED_TO', 0.75, 'Ambas obras permiten pensar la violencia histórica y la guerra.');
  await rel(persistencia.id, saturno.id, 'RELATED_TO', 0.45, 'Ambas pueden leerse desde el tiempo y una dimensión inquietante.');
  await rel(dosFridas.id, maman.id, 'RELATED_TO', 0.6, 'Ambas dialogan con cuerpo, afecto y experiencia personal.');
  await rel(saturno.id, guernica.id, 'RELATED_TO', 0.55, 'Ambas articulan imágenes intensas de destrucción y violencia.');

  // Mention-like curated links
  await rel(persistencia.id, tiempo.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(persistencia.id, memoria.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(dosFridas.id, identidad.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(dosFridas.id, cuerpo.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(dosFridas.id, dolor.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(maman.id, maternidad.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');
  await rel(maman.id, memoria.id, 'MENTIONS', 0.8, 'Mención explícita en el contenido.');

  console.log('✅ Real art seed created successfully.');
  console.log('Entities created:');
  console.log('- 3 periods');
  console.log('- 5 movements');
  console.log('- 8 concepts');
  console.log('- 4 places');
  console.log('- 5 artists');
  console.log('- 6 artworks');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });