import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
  type: 'ARTWORK' | 'ARTIST' | 'ARTICLE' | 'MOVEMENT' | 'PERIOD' | 'CONCEPT' | 'PLACE' | 'TEXT';
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
    canonicalUrl?: string;
    displayUrl?: string;
    sourcePageUrl?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    isVector?: boolean;
    provider?: 'WIKIMEDIA_COMMONS' | 'WIKIPEDIA' | 'MUSEUM' | 'IIIF' | 'OPENVERSE' | 'UNKNOWN';
    qualityTier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'MASTER';
  };
};

function inferMediaMetadata(url: string) {
  const lowerUrl = url.toLowerCase();
  const mimeType = inferMimeType(lowerUrl);
  const isVector = mimeType === 'image/svg+xml';
  const provider = inferMediaProvider(lowerUrl);
  const qualityTier = inferQualityTier(lowerUrl, provider, isVector);

  return {
    canonicalUrl: url,
    displayUrl: url,
    sourcePageUrl: null,
    mimeType,
    isVector,
    provider,
    qualityTier,
  } as const;
}

function inferMimeType(url: string): string {
  if (url.includes('.svg')) return 'image/svg+xml';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.webp')) return 'image/webp';
  if (url.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function inferMediaProvider(url: string): 'WIKIMEDIA_COMMONS' | 'WIKIPEDIA' | 'MUSEUM' | 'IIIF' | 'OPENVERSE' | 'UNKNOWN' {
  if (
    url.includes('upload.wikimedia.org/wikipedia/commons/') ||
    url.includes('commons.wikimedia.org/wiki/file:') ||
    url.includes('commons.wikimedia.org/wiki/special:redirect/file/')
  ) {
    return 'WIKIMEDIA_COMMONS';
  }

  if (url.includes('wikipedia.org/wiki/') || url.includes('upload.wikimedia.org/wikipedia/en/')) {
    return 'WIKIPEDIA';
  }

  if (url.includes('/iiif/') || url.includes('/iiif-img/') || url.includes('/full/full/0/default.')) {
    return 'IIIF';
  }

  if (url.includes('openverse')) {
    return 'OPENVERSE';
  }

  if (
    url.includes('moma.org') ||
    url.includes('museoreinasofia.es') ||
    url.includes('museodelprado.es') ||
    url.includes('tate.org.uk') ||
    url.includes('guggenheim') ||
    url.includes('museo')
  ) {
    return 'MUSEUM';
  }

  return 'UNKNOWN';
}

function inferQualityTier(
  url: string,
  provider: 'WIKIMEDIA_COMMONS' | 'WIKIPEDIA' | 'MUSEUM' | 'IIIF' | 'OPENVERSE' | 'UNKNOWN',
  isVector: boolean,
): 'LOW' | 'MEDIUM' | 'HIGH' | 'MASTER' {
  if (isVector) {
    return 'MEDIUM';
  }

  if (provider === 'IIIF') {
    return 'MASTER';
  }

  if (provider === 'WIKIMEDIA_COMMONS') {
    return 'HIGH';
  }

  if (provider === 'WIKIPEDIA' || url.includes('/wikipedia/en/')) {
    return 'LOW';
  }

  if (provider === 'MUSEUM') {
    return 'HIGH';
  }

  return 'MEDIUM';
}

async function resetDatabase() {
  await prisma.homeDeckItem.deleteMany();
  await prisma.homeDeck.deleteMany();

  await prisma.collectionEntity.deleteMany();
  await prisma.savedEntity.deleteMany();
  await prisma.entityTag.deleteMany();

  await prisma.entityMedia.deleteMany();
  await prisma.sourceRefTranslation.deleteMany();
  await prisma.sourceRef.deleteMany();
  await prisma.contributor.deleteMany();
  await prisma.curatorNote.deleteMany();
  await prisma.relationTranslation.deleteMany();
  await prisma.relation.deleteMany();

  await prisma.artworkDetailsTranslation.deleteMany();
  await prisma.artistDetailsTranslation.deleteMany();
  await prisma.conceptDetailsTranslation.deleteMany();
  await prisma.periodDetailsTranslation.deleteMany();

  await prisma.artworkDetails.deleteMany();
  await prisma.artistDetails.deleteMany();
  await prisma.conceptDetails.deleteMany();
  await prisma.periodDetails.deleteMany();

  await prisma.collection.deleteMany();

  await prisma.media.deleteMany();
  await prisma.sourceTranslation.deleteMany();
  await prisma.source.deleteMany();

  await prisma.entity.deleteMany();
  await prisma.relationTypeTranslation.deleteMany();
  await prisma.tag.deleteMany();
}

const RELATION_TYPES = [
  ['CREATED_BY', 'Creado por', 'Creador de', true, 'authorship', 10],
  ['BELONGS_TO_MOVEMENT', 'Pertenece al movimiento', 'Incluye entity', true, 'taxonomy', 20],
  ['BELONGS_TO_PERIOD', 'Pertenece al periodo', 'Incluye entity', true, 'taxonomy', 30],
  ['ABOUT_CONCEPT', 'Explora el concepto', 'Concepto explorado por', true, 'semantic', 40],
  ['LOCATED_IN', 'Ubicado en', 'Ubicación de', true, 'context', 50],
  ['RELATED_TO', 'Relacionado con', 'Relacionado con', false, 'semantic', 60],
  ['ASSOCIATED_WITH', 'Asociado con', 'Asociado con', false, 'semantic', 70],
  ['MENTIONS', 'Menciona', 'Mencionado por', true, 'content', 80],
  ['INSPIRED_BY', 'Inspirado por', 'Inspira a', true, 'influence', 90],
  ['INFLUENCED_BY', 'Influenciado por', 'Influye en', true, 'influence', 100],
  ['PART_OF', 'Forma parte de', 'Incluye', true, 'structure', 110],
  ['DEPICTS', 'Representa', 'Representado en', true, 'semantic', 120],
  ['SIMILAR_TO', 'Similar a', 'Similar a', false, 'semantic', 130],
  ['USES_TECHNIQUE', 'Usa técnica', 'Técnica usada por', true, 'material', 140],
  ['USES_MATERIAL', 'Usa material', 'Material usado por', true, 'material', 150],
  ['HAS_SUBJECT', 'Tiene tema', 'Tema de', true, 'semantic', 160],
  ['CURATED_WITH', 'Curado junto a', 'Curado junto a', false, 'editorial', 170],
] as const;

async function seedRelationTypes() {
  const englishLabels: Record<string, { label: string; inverseLabel: string | null }> = {
    CREATED_BY: { label: 'Created by', inverseLabel: 'Created' },
    BELONGS_TO_MOVEMENT: { label: 'Belongs to movement', inverseLabel: 'Includes entity' },
    BELONGS_TO_PERIOD: { label: 'Belongs to period', inverseLabel: 'Includes entity' },
    ABOUT_CONCEPT: { label: 'Explores concept', inverseLabel: 'Explored by entity' },
    LOCATED_IN: { label: 'Located in', inverseLabel: 'Location of' },
    RELATED_TO: { label: 'Related to', inverseLabel: 'Related to' },
    ASSOCIATED_WITH: { label: 'Associated with', inverseLabel: 'Associated with' },
    MENTIONS: { label: 'Mentions', inverseLabel: 'Mentioned by' },
    INSPIRED_BY: { label: 'Inspired by', inverseLabel: 'Inspires' },
    INFLUENCED_BY: { label: 'Influenced by', inverseLabel: 'Influences' },
    PART_OF: { label: 'Part of', inverseLabel: 'Includes' },
    DEPICTS: { label: 'Depicts', inverseLabel: 'Depicted in' },
    SIMILAR_TO: { label: 'Similar to', inverseLabel: 'Similar to' },
    USES_TECHNIQUE: { label: 'Uses technique', inverseLabel: 'Technique used by' },
    USES_MATERIAL: { label: 'Uses material', inverseLabel: 'Material used by' },
    HAS_SUBJECT: { label: 'Has subject', inverseLabel: 'Subject of' },
    CURATED_WITH: { label: 'Curated with', inverseLabel: 'Curated with' },
  };

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

    const english = englishLabels[key] ?? { label, inverseLabel };
    await prisma.relationTypeTranslation.upsert({
      where: { relationTypeId_locale: { relationTypeId: relationType.id, locale: 'en' } },
      update: english,
      create: { relationTypeId: relationType.id, locale: 'en', ...english },
    });
  }
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
    const inferred = inferMediaMetadata(input.media.url);
    const media = await prisma.media.create({
      data: {
        url: input.media.url,
        canonicalUrl: input.media.canonicalUrl ?? inferred.canonicalUrl,
        displayUrl: input.media.displayUrl ?? inferred.displayUrl,
        sourcePageUrl: input.media.sourcePageUrl ?? inferred.sourcePageUrl,
        kind: 'IMAGE',
        mimeType: input.media.mimeType ?? inferred.mimeType,
        width: input.media.width,
        height: input.media.height,
        isVector: input.media.isVector ?? inferred.isVector,
        provider: input.media.provider ?? inferred.provider,
        qualityTier: input.media.qualityTier ?? inferred.qualityTier,
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
        role: 'PRIMARY_LEGACY',
        isPrimary: true,
        sortOrder: 0,
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
  const relationType = await prisma.relationType.findUnique({
    where: { key: type },
    select: { id: true },
  });

  return prisma.relation.create({
    data: {
      fromId,
      toId,
      type,
      relationTypeId: relationType?.id,
      weight,
      justification,
    },
  });
}

type ExplicitDetailTranslation = {
  artwork?: {
    authorNation: string | null;
    technique: string | null;
    materials: string | null;
    dimensions: string | null;
    location: string | null;
    collection: string | null;
    state: string | null;
  };
  artist?: {
    country: string | null;
    city: string | null;
    disciplines: string | null;
    bioShort: string | null;
    links: string | null;
  };
  concept?: {
    definition: string | null;
  };
  period?: {
    definition: string | null;
  };
};

type ExplicitEntityTranslation = {
  title: string;
  shortDescription: string | null;
  essay: string | null;
  excerpt?: string | null;
} & ExplicitDetailTranslation;

const ENTITY_EN_BY_SLUG: Record<string, ExplicitEntityTranslation> = {
  'siglo-xix': {
    title: '19th Century',
    shortDescription: 'Historical and artistic period between 1801 and 1900.',
    essay: 'A period shaped by political change, industrialization, Romanticism, Realism, and the rise of new modern sensibilities.',
    period: { definition: 'Historical and cultural period spanning 1801 to 1900.' },
  },
  'siglo-xx': {
    title: '20th Century',
    shortDescription: 'A defining period for the avant-garde and modern art.',
    essay: 'The 20th century brought together the historical avant-garde, world wars, technological transformation, and radical new forms of representation.',
    period: { definition: 'Historical and cultural period spanning 1901 to 2000.' },
  },
  'siglo-xxi': {
    title: '21st Century',
    shortDescription: 'A global and digital contemporary period.',
    essay: 'A period marked by networks, digitization, the global circulation of images, and new models of cultural production.',
    period: { definition: 'Contemporary period from 2001 to the present.' },
  },
  romanticismo: {
    title: 'Romanticism',
    shortDescription: 'A movement that emphasizes emotion, subjectivity, intensity, and historical experience.',
    essay: 'Romanticism privileges emotion, imagination, the sublime, drama, and an intense relationship between art, history, and human experience.',
  },
  cubismo: {
    title: 'Cubism',
    shortDescription: 'An avant-garde movement that fragments and reorganizes representation.',
    essay: 'Cubism reformulates representation through the fragmentation of the picture plane and the coexistence of multiple viewpoints.',
  },
  surrealismo: {
    title: 'Surrealism',
    shortDescription: 'A movement that explores dreams, the unconscious, desire, and irrationality.',
    essay: 'Surrealism explores free association, dream imagery, and unexpected relationships between objects, time, and memory.',
  },
  'arte-moderno': {
    title: 'Modern Art',
    shortDescription: 'A broad field of artistic practices that redefined visual modernity.',
    essay: 'Modern art gathers processes of formal rupture, material experimentation, and new ways of seeing the world.',
  },
  'arte-contemporaneo': {
    title: 'Contemporary Art',
    shortDescription: 'Contemporary, hybrid, and conceptual artistic practices.',
    essay: 'Contemporary art incorporates installation, performance, expanded sculpture, institutional critique, and a strong conceptual dimension.',
  },
  tiempo: {
    title: 'Time',
    shortDescription: 'Duration, change, memory, and finitude.',
    essay: 'In art, time can appear as duration, ruin, repetition, waiting, simultaneity, or materialized memory.',
    concept: { definition: 'A concept tied to duration, change, past, present, future, and historical experience.' },
  },
  memoria: {
    title: 'Memory',
    shortDescription: 'Individual and collective remembrance, archive, and trace.',
    essay: 'Memory articulates identity, history, trauma, archives, and the persistence of images or experiences.',
    concept: { definition: 'A concept linked to remembrance, identity, archives, and the construction of the past.' },
  },
  guerra: {
    title: 'War',
    shortDescription: 'Organized violence, historical conflict, and devastation.',
    essay: 'In art, war appears as trauma, denunciation, destruction, heroism, suffering, and political memory.',
    concept: { definition: 'A concept associated with armed conflict, violence, trauma, and historical memory.' },
  },
  identidad: {
    title: 'Identity',
    shortDescription: 'The symbolic construction of the self, the body, and belonging.',
    essay: 'Identity runs through self-representation, gender, nation, personal memory, and the representation of the body.',
    concept: { definition: 'A concept associated with subjectivity, self-representation, belonging, and difference.' },
  },
  cuerpo: {
    title: 'Body',
    shortDescription: 'Material presence, gesture, vulnerability, and representation.',
    essay: 'The body is support, matter, symbol, political territory, and a form of presence in space.',
    concept: { definition: 'A concept tied to living matter, representation, physical presence, and political dimension.' },
  },
  dolor: {
    title: 'Pain',
    shortDescription: 'Physical, emotional, and symbolic suffering.',
    essay: 'In art, pain is linked to trauma, loss, vulnerability, illness, and resistance.',
    concept: { definition: 'A concept that points to suffering, wounds, loss, and vulnerable experience.' },
  },
  maternidad: {
    title: 'Motherhood',
    shortDescription: 'Bond, care, origin, ambivalence, and affective memory.',
    essay: 'Motherhood can appear as origin, protection, affective tension, a shared body, or emotional ambivalence.',
    concept: { definition: 'A concept associated with care, origin, affective bonds, and the symbolic dimension of the maternal.' },
  },
  violencia: {
    title: 'Violence',
    shortDescription: 'Physical, symbolic, social, or historical harm.',
    essay: 'In art, violence can manifest as aggression, trauma, imposition, rupture, or visual denunciation.',
    concept: { definition: 'A concept associated with harm, imposition, trauma, rupture, and conflict.' },
  },
  'museo-del-prado': {
    title: 'Museo del Prado',
    shortDescription: 'A national art museum located in Madrid.',
    essay: 'A central institution for the history of European and Spanish art, with one of the most important collections in the world.',
  },
  'museo-reina-sofia': {
    title: 'Museo Reina Sofia',
    shortDescription: 'A national museum of modern and contemporary art in Madrid.',
    essay: 'A key institution for the study of modern and contemporary art in Spain.',
  },
  moma: {
    title: 'MoMA',
    shortDescription: 'The Museum of Modern Art in New York.',
    essay: 'A central museum for the study of international modern and contemporary art.',
  },
  'guggenheim-bilbao': {
    title: 'Guggenheim Bilbao',
    shortDescription: 'A contemporary art museum located in Bilbao.',
    essay: 'An internationally recognized museum known for its architecture and contemporary art collection.',
  },
  'francisco-de-goya': {
    title: 'Francisco de Goya',
    shortDescription: 'A Spanish painter and printmaker who was crucial to the transition from the Ancien Regime to modernity.',
    essay: 'Francisco de Goya was one of the most influential artists in the history of Spanish art. His work spans portraiture, history painting, social critique, violence, and dark visions of the human condition.',
    artist: {
      country: 'Spain',
      city: 'Fuendetodos',
      disciplines: 'Painting, Printmaking',
      bioShort: 'A key figure in Spanish painting, celebrated for his critical, expressive, and visionary power.',
      links: 'https://www.museodelprado.es',
    },
  },
  'pablo-picasso': {
    title: 'Pablo Picasso',
    shortDescription: 'A Spanish painter, sculptor, and maker who became a central figure of 20th-century art.',
    essay: 'Pablo Picasso was a decisive figure in modern art. His work spans painting, sculpture, printmaking, and formal experimentation, with an essential role in Cubism.',
    artist: {
      country: 'Spain',
      city: 'Malaga',
      disciplines: 'Painting, Sculpture, Printmaking',
      bioShort: 'A central figure of the 20th-century avant-garde and co-founder of Cubism.',
      links: 'https://www.museoreinasofia.es',
    },
  },
  'salvador-dali': {
    title: 'Salvador Dali',
    shortDescription: 'A Spanish artist associated with Surrealism and the exploration of dream imagery.',
    essay: 'Salvador Dali developed a highly recognizable body of work shaped by dream images, unexpected associations, and visual reflections on time and desire.',
    artist: {
      country: 'Spain',
      city: 'Figueres',
      disciplines: 'Painting, Drawing, Sculpture, Design',
      bioShort: 'One of the most recognizable Surrealist artists, celebrated for his dreamlike and symbolic imagery.',
      links: 'https://www.moma.org',
    },
  },
  'frida-kahlo': {
    title: 'Frida Kahlo',
    shortDescription: 'A Mexican painter known for her self-representations and her exploration of identity, pain, and the body.',
    essay: 'Frida Kahlo turned personal, bodily, and emotional experience into a powerful form of artistic representation. Her work is tied to identity, pain, memory, and self-representation.',
    artist: {
      country: 'Mexico',
      city: 'Coyoacan',
      disciplines: 'Painting',
      bioShort: 'A key 20th-century artist whose work turns personal and bodily experience into visual language.',
      links: 'https://www.moma.org/artists/2963',
    },
  },
  'louise-bourgeois': {
    title: 'Louise Bourgeois',
    shortDescription: 'A French-American artist essential to sculpture and contemporary art.',
    essay: 'Louise Bourgeois developed a body of work of great psychological intensity, tied to memory, the body, motherhood, pain, and sculptural space.',
    artist: {
      country: 'France / United States',
      city: 'Paris',
      disciplines: 'Sculpture, Installation, Drawing',
      bioShort: 'A foundational sculptor of contemporary art, associated with memory, the body, and motherhood.',
      links: 'https://www.tate.org.uk/art/artists/louise-bourgeois-2351',
    },
  },
  'saturno-devorando-a-su-hijo': {
    title: 'Saturn Devouring His Son',
    shortDescription: 'One of Goya\'s Black Paintings, marked by violence, darkness, and expressive force.',
    essay: 'This work by Francisco de Goya condenses violence, time, destruction, and an extreme vision of the human condition. It can be connected to [[violence]], [[time]], and [[pain]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil transferred to canvas',
      materials: 'Oil paint',
      dimensions: '143.5 x 81.4 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Black Paintings',
      state: 'Preserved',
    },
  },
  'el-tres-de-mayo-de-1808': {
    title: 'The Third of May 1808',
    shortDescription: 'A history painting by Goya about the violence of war and execution.',
    essay: 'A central work for thinking about [[war]], [[violence]], and historical memory. Its visual drama and political dimension make it a decisive image of modernity.',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '268 x 347 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  guernica: {
    title: 'Guernica',
    shortDescription: 'Picasso\'s monumental work on the horror of bombing and the violence of war.',
    essay: '[[Guernica]] articulates a visual reflection on [[war]], [[violence]], and historical memory. It also connects with the formal fragmentation of [[cubism]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '349.3 x 776.6 cm',
      location: 'Museo Reina Sofia, Madrid',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'la-persistencia-de-la-memoria': {
    title: 'The Persistence of Memory',
    shortDescription: 'Dali\'s iconic work on time, dreams, instability, and perception.',
    essay: 'This work connects directly with [[time]] and [[memory]], and also with the imagery of [[surrealism]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '24 x 33 cm',
      location: 'MoMA, New York',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'las-dos-fridas': {
    title: 'The Two Fridas',
    shortDescription: 'A double self-representation by Frida Kahlo tied to identity, the body, and pain.',
    essay: 'A key work for thinking about [[identity]], [[body]], and [[pain]] through self-representation. It can also be read through affective memory and inner division.',
    artwork: {
      authorNation: 'Mexican',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '173 x 173 cm',
      location: 'Museo de Arte Moderno, Mexico City',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  maman: {
    title: 'Maman',
    shortDescription: 'Louise Bourgeois\'s monumental sculpture associated with motherhood, memory, and affective ambivalence.',
    essay: '[[Maman]] connects with [[motherhood]], [[memory]], and [[body]]. Its monumental scale intensifies its emotional and spatial reading.',
    artwork: {
      authorNation: 'French-American',
      technique: 'Monumental sculpture',
      materials: 'Bronze, stainless steel, and marble',
      dimensions: 'approx. 927 x 891 x 1024 cm',
      location: 'Guggenheim Bilbao',
      collection: 'Installation / associated collection',
      state: 'Preserved',
    },
  },
};

const SOURCE_EN_BY_KEY: Record<string, { title: string; author: string | null; publisher: string | null }> = {
  'https://www.museodelprado.es': {
    title: 'Museo del Prado Collection',
    author: 'Museo Nacional del Prado',
    publisher: 'Museo del Prado',
  },
  'https://www.museoreinasofia.es': {
    title: 'Museo Reina Sofia Collection',
    author: 'Museo Nacional Centro de Arte Reina Sofia',
    publisher: 'Museo Reina Sofia',
  },
  'https://www.moma.org': {
    title: 'MoMA Collection',
    author: 'The Museum of Modern Art',
    publisher: 'MoMA',
  },
  'https://www.moma.org/artists/2963': {
    title: 'Frida Kahlo References',
    author: 'Museum of Modern Art / museum references',
    publisher: 'Museum references',
  },
  'https://www.tate.org.uk': {
    title: 'Louise Bourgeois Overview',
    author: 'Tate',
    publisher: 'Tate',
  },
};

const SOURCE_REF_EN_BY_KEY: Record<string, { quote: string | null; note: string | null }> = {
  'francisco-de-goya::https://www.museodelprado.es': { quote: null, note: 'Primary institutional reference.' },
  'saturno-devorando-a-su-hijo::https://www.museodelprado.es': { quote: null, note: 'Institutional work record.' },
  'el-tres-de-mayo-de-1808::https://www.museodelprado.es': { quote: null, note: 'Institutional work record.' },
  'pablo-picasso::https://www.museoreinasofia.es': { quote: null, note: 'Primary institutional reference.' },
  'guernica::https://www.museoreinasofia.es': { quote: null, note: 'Institutional work record.' },
  'salvador-dali::https://www.moma.org': { quote: null, note: 'Primary institutional reference.' },
  'la-persistencia-de-la-memoria::https://www.moma.org': { quote: null, note: 'Institutional work record.' },
  'frida-kahlo::https://www.moma.org/artists/2963': { quote: null, note: 'Museum reference.' },
  'las-dos-fridas::https://www.moma.org/artists/2963': { quote: null, note: 'Contextual reference for the artist and the work.' },
  'louise-bourgeois::https://www.tate.org.uk': { quote: null, note: 'Institutional and contextual reference.' },
  'maman::https://www.tate.org.uk': { quote: null, note: 'Contextual reference on the artist and her work.' },
};

const RELATION_EN_BY_KEY: Record<string, string> = {
  'memoria::RELATED_TO::identidad': 'Memory plays a role in the construction of identity.',
  'tiempo::RELATED_TO::memoria': 'The experience of memory is tied to temporality.',
  'cuerpo::RELATED_TO::identidad': 'The body is a key dimension of identity.',
  'dolor::RELATED_TO::cuerpo': 'Pain is experienced through the body.',
  'maternidad::RELATED_TO::memoria': 'Motherhood can articulate affective and symbolic memory.',
  'guerra::RELATED_TO::violencia': 'War is a historical form of violence.',
  'francisco-de-goya::ASSOCIATED_WITH::romanticismo': 'Goya is a foundational figure in the origins of modern and Romantic sensibility.',
  'pablo-picasso::BELONGS_TO_MOVEMENT::cubismo': 'Picasso is a co-founder of Cubism.',
  'salvador-dali::BELONGS_TO_MOVEMENT::surrealismo': 'Dali is a key figure of Surrealism.',
  'frida-kahlo::ASSOCIATED_WITH::arte-moderno': 'Frida Kahlo is studied within the field of 20th-century modern art.',
  'louise-bourgeois::ASSOCIATED_WITH::arte-contemporaneo': 'Louise Bourgeois is central to contemporary art.',
  'francisco-de-goya::BELONGS_TO_PERIOD::siglo-xix': 'Goya belongs historically to the late 18th and early 19th centuries.',
  'pablo-picasso::BELONGS_TO_PERIOD::siglo-xx': 'Picasso is central to 20th-century art.',
  'salvador-dali::BELONGS_TO_PERIOD::siglo-xx': 'Dali belongs to the 20th century.',
  'frida-kahlo::BELONGS_TO_PERIOD::siglo-xx': 'Frida Kahlo belongs to the 20th century.',
  'louise-bourgeois::BELONGS_TO_PERIOD::siglo-xx': 'Bourgeois\'s career unfolds primarily in the 20th century.',
  'frida-kahlo::ASSOCIATED_WITH::identidad': 'Identity is central to Frida Kahlo\'s work.',
  'frida-kahlo::ASSOCIATED_WITH::cuerpo': 'The body is central to Frida Kahlo\'s work.',
  'frida-kahlo::ASSOCIATED_WITH::dolor': 'Pain is a key axis in Frida Kahlo\'s work.',
  'louise-bourgeois::ASSOCIATED_WITH::memoria': 'Memory is a fundamental dimension of Bourgeois\'s work.',
  'louise-bourgeois::ASSOCIATED_WITH::maternidad': 'Motherhood is an important conceptual axis in Bourgeois.',
  'louise-bourgeois::ASSOCIATED_WITH::cuerpo': 'The body runs through Bourgeois\'s sculptural work.',
  'salvador-dali::ASSOCIATED_WITH::tiempo': 'Temporality is a central theme in Dali\'s work.',
  'salvador-dali::ASSOCIATED_WITH::memoria': 'Memory and psychic imagery carry weight in Dali\'s work.',
  'francisco-de-goya::ASSOCIATED_WITH::violencia': 'Goya addresses historical and human violence.',
  'francisco-de-goya::ASSOCIATED_WITH::guerra': 'Goya represents war with critical intensity.',
  'pablo-picasso::ASSOCIATED_WITH::guerra': 'War is a central axis in Guernica.',
  'pablo-picasso::ASSOCIATED_WITH::violencia': 'Picasso thematizes political violence in key works.',
  'saturno-devorando-a-su-hijo::CREATED_BY::francisco-de-goya': 'Direct authorship.',
  'el-tres-de-mayo-de-1808::CREATED_BY::francisco-de-goya': 'Direct authorship.',
  'guernica::CREATED_BY::pablo-picasso': 'Direct authorship.',
  'la-persistencia-de-la-memoria::CREATED_BY::salvador-dali': 'Direct authorship.',
  'las-dos-fridas::CREATED_BY::frida-kahlo': 'Direct authorship.',
  'maman::CREATED_BY::louise-bourgeois': 'Direct authorship.',
  'saturno-devorando-a-su-hijo::BELONGS_TO_MOVEMENT::romanticismo': 'A work associated with Romantic and premodern sensibility.',
  'el-tres-de-mayo-de-1808::BELONGS_TO_MOVEMENT::romanticismo': 'A key work of Romantic historical drama.',
  'guernica::BELONGS_TO_MOVEMENT::cubismo': 'Its formal fragmentation is linked to Cubist language.',
  'la-persistencia-de-la-memoria::BELONGS_TO_MOVEMENT::surrealismo': 'An emblematic work of Surrealism.',
  'las-dos-fridas::BELONGS_TO_MOVEMENT::arte-moderno': 'It is studied within the languages of 20th-century modern art.',
  'maman::BELONGS_TO_MOVEMENT::arte-contemporaneo': 'A central sculpture of contemporary art.',
  'saturno-devorando-a-su-hijo::BELONGS_TO_PERIOD::siglo-xix': 'A work from the early 19th century.',
  'el-tres-de-mayo-de-1808::BELONGS_TO_PERIOD::siglo-xix': 'A work from 1814.',
  'guernica::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1937.',
  'la-persistencia-de-la-memoria::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1931.',
  'las-dos-fridas::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1939.',
  'maman::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1999.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::violencia': 'The work expresses radical violence.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::tiempo': 'It can be read through destruction and devouring time.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::dolor': 'Its emotional intensity points to pain.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::guerra': 'The work depicts war and execution.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::violencia': 'Violence is explicit and central.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::memoria': 'It can also be read as historical memory.',
  'guernica::ABOUT_CONCEPT::guerra': 'War is the central axis of the work.',
  'guernica::ABOUT_CONCEPT::violencia': 'Violence runs through the composition.',
  'guernica::ABOUT_CONCEPT::memoria': 'The work operates as historical memory of the bombing.',
  'la-persistencia-de-la-memoria::ABOUT_CONCEPT::tiempo': 'The work is emblematic for thinking about time.',
  'la-persistencia-de-la-memoria::ABOUT_CONCEPT::memoria': 'Its title and imagery point to memory and persistence.',
  'las-dos-fridas::ABOUT_CONCEPT::identidad': 'Identity is one of its most evident axes.',
  'las-dos-fridas::ABOUT_CONCEPT::cuerpo': 'Bodily representation is central.',
  'las-dos-fridas::ABOUT_CONCEPT::dolor': 'Wound and suffering are visible.',
  'maman::ABOUT_CONCEPT::maternidad': 'The work is deeply tied to the maternal.',
  'maman::ABOUT_CONCEPT::memoria': 'Affective memory is central to the reading of the work.',
  'maman::ABOUT_CONCEPT::cuerpo': 'The sculpture\'s bodily monumentality suggests it.',
  'saturno-devorando-a-su-hijo::LOCATED_IN::museo-del-prado': 'The work is housed at Museo del Prado.',
  'el-tres-de-mayo-de-1808::LOCATED_IN::museo-del-prado': 'The work is housed at Museo del Prado.',
  'guernica::LOCATED_IN::museo-reina-sofia': 'The work is housed at Museo Reina Sofia.',
  'la-persistencia-de-la-memoria::LOCATED_IN::moma': 'The work is housed at MoMA.',
  'maman::LOCATED_IN::guggenheim-bilbao': 'An emblematic version or installation is associated with Guggenheim Bilbao.',
  'guernica::RELATED_TO::el-tres-de-mayo-de-1808': 'Both works invite reflection on historical violence and war.',
  'la-persistencia-de-la-memoria::RELATED_TO::saturno-devorando-a-su-hijo': 'Both can be read through time and an unsettling dimension.',
  'las-dos-fridas::RELATED_TO::maman': 'Both works engage with the body, affect, and personal experience.',
  'saturno-devorando-a-su-hijo::RELATED_TO::guernica': 'Both articulate intense images of destruction and violence.',
  'la-persistencia-de-la-memoria::MENTIONS::tiempo': 'Explicit mention in the content.',
  'la-persistencia-de-la-memoria::MENTIONS::memoria': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::identidad': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::cuerpo': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::dolor': 'Explicit mention in the content.',
  'maman::MENTIONS::maternidad': 'Explicit mention in the content.',
  'maman::MENTIONS::memoria': 'Explicit mention in the content.',
};

function requireDemoTranslation<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Missing English demo translation for ${label}`);
  }

  return value;
}

async function seedEntityTranslations() {
  const entities = await prisma.entity.findMany({
    include: {
      artwork: true,
      artist: true,
      concept: true,
      period: true,
    },
  });

  for (const entity of entities) {
    const english: ExplicitEntityTranslation = ENTITY_EN_BY_SLUG[entity.slug] ?? {
      title: entity.title,
      shortDescription: entity.summary ?? null,
      essay: entity.content ?? null,
      excerpt: entity.summary ?? null,
    };

    await prisma.entityTranslation.upsert({
      where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
      update: {
        title: entity.title,
        shortDescription: entity.summary ?? null,
        essay: entity.content ?? null,
        excerpt: entity.summary ?? null,
      },
      create: {
        entityId: entity.id,
        locale: 'es',
        title: entity.title,
        shortDescription: entity.summary ?? null,
        essay: entity.content ?? null,
        excerpt: entity.summary ?? null,
      },
    });

    await prisma.entityTranslation.upsert({
      where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
      update: {
        title: english.title,
        shortDescription: english.shortDescription,
        essay: english.essay,
        excerpt: english.excerpt ?? english.shortDescription,
      },
      create: {
        entityId: entity.id,
        locale: 'en',
        title: english.title,
        shortDescription: english.shortDescription,
        essay: english.essay,
        excerpt: english.excerpt ?? english.shortDescription,
      },
    });

    if (entity.artwork) {
      const artworkEn = requireDemoTranslation(english.artwork, `artwork:${entity.slug}`);
      await prisma.artworkDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        update: {
          authorNation: entity.artwork.authorNation ?? null,
          technique: entity.artwork.technique ?? null,
          materials: entity.artwork.materials ?? null,
          dimensions: entity.artwork.dimensions ?? null,
          location: entity.artwork.location ?? null,
          collection: entity.artwork.collection ?? null,
          state: entity.artwork.state ?? null,
        },
        create: {
          entityId: entity.id,
          locale: 'es',
          authorNation: entity.artwork.authorNation ?? null,
          technique: entity.artwork.technique ?? null,
          materials: entity.artwork.materials ?? null,
          dimensions: entity.artwork.dimensions ?? null,
          location: entity.artwork.location ?? null,
          collection: entity.artwork.collection ?? null,
          state: entity.artwork.state ?? null,
        },
      });
      await prisma.artworkDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        update: artworkEn,
        create: { entityId: entity.id, locale: 'en', ...artworkEn },
      });
    }

    if (entity.artist) {
      const artistEn = requireDemoTranslation(english.artist, `artist:${entity.slug}`);
      await prisma.artistDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        update: {
          country: entity.artist.country ?? null,
          city: entity.artist.city ?? null,
          disciplines: entity.artist.disciplines ?? null,
          bioShort: entity.artist.bioShort ?? null,
          links: entity.artist.links ?? null,
        },
        create: {
          entityId: entity.id,
          locale: 'es',
          country: entity.artist.country ?? null,
          city: entity.artist.city ?? null,
          disciplines: entity.artist.disciplines ?? null,
          bioShort: entity.artist.bioShort ?? null,
          links: entity.artist.links ?? null,
        },
      });
      await prisma.artistDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        update: artistEn,
        create: { entityId: entity.id, locale: 'en', ...artistEn },
      });
    }

    if (entity.concept) {
      const conceptEn = requireDemoTranslation(english.concept, `concept:${entity.slug}`);
      await prisma.conceptDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        update: { definition: entity.concept.definition ?? null },
        create: { entityId: entity.id, locale: 'es', definition: entity.concept.definition ?? null },
      });
      await prisma.conceptDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        update: conceptEn,
        create: { entityId: entity.id, locale: 'en', ...conceptEn },
      });
    }

    if (entity.period) {
      const periodEn = requireDemoTranslation(english.period, `period:${entity.slug}`);
      await prisma.periodDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        update: { definition: entity.period.definition ?? null },
        create: { entityId: entity.id, locale: 'es', definition: entity.period.definition ?? null },
      });
      await prisma.periodDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        update: periodEn,
        create: { entityId: entity.id, locale: 'en', ...periodEn },
      });
    }
  }
}

async function seedSourceTranslations() {
  const sources = await prisma.source.findMany();
  for (const source of sources) {
    const sourceKey = source.url?.trim() || source.title.trim();
    const english = requireDemoTranslation(SOURCE_EN_BY_KEY[sourceKey], `source:${sourceKey}`);
    await prisma.sourceTranslation.upsert({
      where: { sourceId_locale: { sourceId: source.id, locale: 'es' } },
      update: { title: source.title, author: source.author ?? null, publisher: source.publisher ?? null },
      create: { sourceId: source.id, locale: 'es', title: source.title, author: source.author ?? null, publisher: source.publisher ?? null },
    });
    await prisma.sourceTranslation.upsert({
      where: { sourceId_locale: { sourceId: source.id, locale: 'en' } },
      update: english,
      create: { sourceId: source.id, locale: 'en', ...english },
    });
  }
}

async function seedRelationAndSourceRefTranslations() {
  const relations = await prisma.relation.findMany({
    include: {
      from: { select: { slug: true } },
      to: { select: { slug: true } },
    },
  });
  for (const relation of relations) {
    const relationKey = `${relation.from.slug}::${relation.type}::${relation.to.slug}`;
    const justificationEn = RELATION_EN_BY_KEY[relationKey] ?? relation.justification ?? null;
    await prisma.relationTranslation.upsert({
      where: { relationId_locale: { relationId: relation.id, locale: 'es' } },
      update: { justification: relation.justification ?? null },
      create: { relationId: relation.id, locale: 'es', justification: relation.justification ?? null },
    });
    await prisma.relationTranslation.upsert({
      where: { relationId_locale: { relationId: relation.id, locale: 'en' } },
      update: { justification: justificationEn },
      create: { relationId: relation.id, locale: 'en', justification: justificationEn },
    });
  }

  const sourceRefs = await prisma.sourceRef.findMany({
    include: {
      entity: { select: { slug: true } },
      source: { select: { url: true, title: true } },
    },
  });
  for (const ref of sourceRefs) {
    const sourceKey = ref.source.url?.trim() || ref.source.title.trim();
    const refKey = `${ref.entity.slug}::${sourceKey}`;
    const english = requireDemoTranslation(SOURCE_REF_EN_BY_KEY[refKey], `sourceRef:${refKey}`);
    await prisma.sourceRefTranslation.upsert({
      where: { sourceRefId_locale: { sourceRefId: ref.id, locale: 'es' } },
      update: { quote: ref.quote ?? null, note: ref.note ?? null },
      create: { sourceRefId: ref.id, locale: 'es', quote: ref.quote ?? null, note: ref.note ?? null },
    });
    await prisma.sourceRefTranslation.upsert({
      where: { sourceRefId_locale: { sourceRefId: ref.id, locale: 'en' } },
      update: english,
      create: { sourceRefId: ref.id, locale: 'en', ...english },
    });
  }
}

async function main() {
  console.log('🧹 Resetting demo data...');
  await resetDatabase();

  console.log('🔗 Seeding relation types...');
  await seedRelationTypes();

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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Goya_-_The_Third_of_May_1808_in_Madrid.jpg',
      alt: 'El tres de mayo de 1808 de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      sourcePageUrl: 'https://www.museoreinasofia.es/en/collection/artwork/guernica',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'Guernica de Pablo Picasso',
      source: 'Museo Reina Sofía / referencia visual',
      photoBy: 'Pablo Picasso',
      license: 'Uso informativo / referencia visual',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Guggenheim_Bilbao_Museoa.jpg',
      alt: 'Vista exterior del Guggenheim Bilbao',
      source: 'Wikimedia Commons',
      photoBy: 'Francisco Anzola',
      license: 'CC BY 2.0',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Goya_-_The_Third_of_May_1808_in_Madrid.jpg',
      alt: 'El tres de mayo de 1808 de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
  });

  const cubismo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Cubismo',
    slug: 'cubismo',
    summary:
      'Movimiento de vanguardia que fragmenta y reorganiza la representación.',
    content:
      'El Cubismo reformula la representación mediante la fragmentación del plano y la multiplicidad de puntos de vista.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      sourcePageUrl: 'https://www.museoreinasofia.es/en/collection/artwork/guernica',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'Guernica de Pablo Picasso',
      source: 'Museo Reina Sofía / referencia visual',
      photoBy: 'Pablo Picasso',
      license: 'Uso informativo / referencia visual',
    },
  });

  const surrealismo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Surrealismo',
    slug: 'surrealismo',
    summary:
      'Movimiento que explora sueño, subconsciente, deseo e irracionalidad.',
    content:
      'El Surrealismo explora asociaciones libres, imágenes oníricas y relaciones inesperadas entre objetos, tiempo y memoria.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      sourcePageUrl: 'https://www.moma.org/collection/works/79018',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'La persistencia de la memoria de Salvador Dalí',
      source: 'MoMA / referencia visual',
      photoBy: 'Salvador Dalí',
      license: 'Uso informativo / referencia visual',
    },
  });

  const arteModerno = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Arte moderno',
    slug: 'arte-moderno',
    summary:
      'Conjunto amplio de prácticas artísticas que redefinen la modernidad visual.',
    content:
      'El arte moderno reúne procesos de ruptura formal, experimentación material y nuevas formas de ver el mundo.',
    media: {
      url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Museum_of_Modern_Art%2C_MoMA%2C_New_York_%2850415923226%29.jpg',
      canonicalUrl:
        'https://commons.wikimedia.org/wiki/File:The_Museum_of_Modern_Art,_MoMA,_New_York_(50415923226).jpg',
      displayUrl:
        'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Museum_of_Modern_Art%2C_MoMA%2C_New_York_%2850415923226%29.jpg',
      sourcePageUrl:
        'https://commons.wikimedia.org/wiki/File:The_Museum_of_Modern_Art,_MoMA,_New_York_(50415923226).jpg',
      mimeType: 'image/jpeg',
      width: 6000,
      height: 4000,
      isVector: false,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Vista exterior del Museum of Modern Art de Nueva York',
      source: 'Wikimedia Commons',
      photoBy: 'Ming-yen Hsu',
      license: 'CC BY 2.0',
    },
  });

  const arteContemporaneo = await createEntityWithOptionalPrimaryMedia({
    type: 'MOVEMENT',
    title: 'Arte contemporáneo',
    slug: 'arte-contemporaneo',
    summary:
      'Prácticas artísticas contemporáneas, híbridas y conceptuales.',
    content:
      'El arte contemporáneo incorpora instalación, performance, escultura expandida, crítica institucional y una fuerte dimensión conceptual.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      mimeType: 'image/jpeg',
      width: 1613,
      height: 1097,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Maman de Louise Bourgeois frente a la National Gallery of Canada',
      source: 'Wikimedia Commons',
      photoBy: 'Radagast',
      license: 'Public domain',
    },
  });

  const barroco = await createEntityWithOptionalPrimaryMedia({ type: 'MOVEMENT', title: 'Barroco', slug: 'barroco', summary: 'Dramatismo, teatralidad, poder e imagen religiosa.', content: 'El Barroco intensifica la emoción, el cuerpo, la luz, la propaganda política y la experiencia religiosa.' });
  const popArt = await createEntityWithOptionalPrimaryMedia({ type: 'MOVEMENT', title: 'Pop Art', slug: 'pop-art', summary: 'Consumo, medios de masas, celebridad e imagen popular.', content: 'El Pop Art trabaja con publicidad, cine, prensa, consumo, repetición y cultura visual urbana.' });
  const dadaismo = await createEntityWithOptionalPrimaryMedia({ type: 'MOVEMENT', title: 'Dadaísmo', slug: 'dadaismo', summary: 'Antiarte, gesto crítico, objeto encontrado y ruptura institucional.', content: 'El Dadaísmo cuestiona autoría, gusto, museo y sentido estable de la obra de arte.' });
  const expresionismo = await createEntityWithOptionalPrimaryMedia({ type: 'MOVEMENT', title: 'Expresionismo', slug: 'expresionismo', summary: 'Intensidad emocional, cuerpo deformado y ansiedad moderna.', content: 'El Expresionismo hace visible angustia, violencia interior, cuerpo vulnerable y crisis de la modernidad.' });
  const realismoAmericano = await createEntityWithOptionalPrimaryMedia({ type: 'MOVEMENT', title: 'Realismo americano', slug: 'realismo-americano', summary: 'Ciudad, soledad moderna, escena cotidiana y mirada contenida.', content: 'El realismo americano observa la vida urbana, el aislamiento, la arquitectura y la psicología de lo cotidiano.' });

  console.log('💡 Creating concepts...');

  const tiempo = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Tiempo',
    slug: 'tiempo',
    summary: 'Duración, cambio, memoria y finitud.',
    content:
      'El tiempo en arte puede aparecer como duración, ruina, repetición, espera, simultaneidad o memoria materializada.',
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      sourcePageUrl: 'https://www.moma.org/collection/works/79018',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'La persistencia de la memoria de Salvador Dalí',
      source: 'MoMA / referencia visual',
      photoBy: 'Salvador Dalí',
      license: 'Uso informativo / referencia visual',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      sourcePageUrl: 'https://www.moma.org/collection/works/79018',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'La persistencia de la memoria de Salvador Dalí',
      source: 'MoMA / referencia visual',
      photoBy: 'Salvador Dalí',
      license: 'Uso informativo / referencia visual',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      sourcePageUrl: 'https://www.museoreinasofia.es/en/collection/artwork/guernica',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
      alt: 'Guernica de Pablo Picasso',
      source: 'Museo Reina Sofía / referencia visual',
      photoBy: 'Pablo Picasso',
      license: 'Uso informativo / referencia visual',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 736,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'MEDIUM',
      alt: 'Las dos Fridas de Frida Kahlo',
      source: 'Wikimedia Commons / referencia visual',
      photoBy: 'Ed Uthman',
      license: 'CC BY 2.0',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 736,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'MEDIUM',
      alt: 'Las dos Fridas de Frida Kahlo',
      source: 'Wikimedia Commons / referencia visual',
      photoBy: 'Ed Uthman',
      license: 'CC BY 2.0',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 736,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'MEDIUM',
      alt: 'Las dos Fridas de Frida Kahlo',
      source: 'Wikimedia Commons / referencia visual',
      photoBy: 'Ed Uthman',
      license: 'CC BY 2.0',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      mimeType: 'image/jpeg',
      width: 1613,
      height: 1097,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Maman de Louise Bourgeois frente a la National Gallery of Canada',
      source: 'Wikimedia Commons',
      photoBy: 'Radagast',
      license: 'Public domain',
    },
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
    media: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg',
      alt: 'Saturno devorando a su hijo de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Dominio público',
      license: 'Public domain',
    },
  });

  await prisma.conceptDetails.create({
    data: {
      entityId: violencia.id,
      definition:
        'Concepto asociado a daño, imposición, trauma, ruptura y conflicto.',
    },
  });

  const muerte = await createEntityWithOptionalPrimaryMedia({
    type: 'CONCEPT',
    title: 'Muerte',
    slug: 'muerte',
    summary: 'Finitud, duelo, desaparición y memoria ritual.',
    content: 'La muerte atraviesa vanitas, martirios, memoria familiar, duelo moderno y preguntas sobre la permanencia de las imágenes.',
  });
  await prisma.conceptDetails.create({ data: { entityId: muerte.id, definition: 'Concepto asociado a finitud, duelo, memoria y representación del límite vital.' } });

  const poder = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Poder', slug: 'poder', summary: 'Autoridad, representación política, control y propaganda.', content: 'El poder se representa en retratos oficiales, arquitectura, imágenes religiosas, cuerpos disciplinados y cultura de masas.' });
  await prisma.conceptDetails.create({ data: { entityId: poder.id, definition: 'Concepto ligado a autoridad, dominio, representación pública e imagen política.' } });

  const religion = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Religión', slug: 'religion', summary: 'Creencia, rito, iconografía y experiencia espiritual.', content: 'La religión organiza imágenes de devoción, sacrificio, comunidad, misterio, muerte y trascendencia.' });
  await prisma.conceptDetails.create({ data: { entityId: religion.id, definition: 'Concepto asociado a rito, fe, iconografía y experiencia espiritual.' } });

  const naturaleza = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Naturaleza', slug: 'naturaleza', summary: 'Paisaje, materia viva, clima y relación con el mundo natural.', content: 'La naturaleza aparece como paisaje, refugio, amenaza, materia, símbolo y campo de transformación cultural.' });
  await prisma.conceptDetails.create({ data: { entityId: naturaleza.id, definition: 'Concepto vinculado a paisaje, vida, materia y entorno.' } });

  const ciudad = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Ciudad', slug: 'ciudad', summary: 'Modernidad urbana, arquitectura, soledad y vida colectiva.', content: 'La ciudad condensa experiencia moderna, anonimato, espectáculo, trabajo, publicidad y nuevas formas de mirar.' });
  await prisma.conceptDetails.create({ data: { entityId: ciudad.id, definition: 'Concepto asociado a espacio urbano, modernidad y vida social.' } });

  const deporte = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Deporte', slug: 'deporte', summary: 'Cuerpo, competición, masa social y cultura visual popular.', content: 'El deporte conecta cuerpo, movimiento, espectáculo, identidad colectiva, medios de masas y representación contemporánea.' });
  await prisma.conceptDetails.create({ data: { entityId: deporte.id, definition: 'Concepto que vincula cuerpo, juego, competición e imaginario social.' } });

  const futbol = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Fútbol', slug: 'futbol', summary: 'Juego, multitud, identidad colectiva y espectáculo popular.', content: 'El fútbol puede leerse desde deporte, cuerpo, ritual colectivo, ciudad, nación, cultura de masas y estética del movimiento.' });
  await prisma.conceptDetails.create({ data: { entityId: futbol.id, definition: 'Concepto asociado a deporte, multitud, identidad popular y cultura visual.' } });

  const genero = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Género', slug: 'genero', summary: 'Identidad, cuerpo, roles sociales y representación.', content: 'El género permite leer cómo las imágenes construyen mujer, masculinidad, deseo, norma, poder y diferencia.' });
  await prisma.conceptDetails.create({ data: { entityId: genero.id, definition: 'Concepto asociado a identidad, cuerpo, roles sociales y representación cultural.' } });

  const vejez = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Vejez', slug: 'vejez', summary: 'Tiempo vivido, fragilidad, memoria y dignidad del cuerpo.', content: 'La vejez en arte aparece como huella del tiempo, sabiduría, vulnerabilidad, retrato psicológico y conciencia de la muerte.' });
  await prisma.conceptDetails.create({ data: { entityId: vejez.id, definition: 'Concepto vinculado a tiempo, cuerpo, memoria y finitud.' } });

  const juventud = await createEntityWithOptionalPrimaryMedia({ type: 'CONCEPT', title: 'Juventud', slug: 'juventud', summary: 'Energía, formación, belleza, rebeldía y promesa.', content: 'La juventud aparece como ideal, potencia física, aprendizaje, deseo, moda, rebeldía y construcción social.' });
  await prisma.conceptDetails.create({ data: { entityId: juventud.id, definition: 'Concepto asociado a energía vital, promesa, cuerpo joven e identidad en formación.' } });

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
      url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Museum_of_Modern_Art%2C_MoMA%2C_New_York_%2850415923226%29.jpg',
      canonicalUrl:
        'https://commons.wikimedia.org/wiki/File:The_Museum_of_Modern_Art,_MoMA,_New_York_(50415923226).jpg',
      displayUrl:
        'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Museum_of_Modern_Art%2C_MoMA%2C_New_York_%2850415923226%29.jpg',
      sourcePageUrl:
        'https://commons.wikimedia.org/wiki/File:The_Museum_of_Modern_Art,_MoMA,_New_York_(50415923226).jpg',
      mimeType: 'image/jpeg',
      width: 6000,
      height: 4000,
      isVector: false,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Vista exterior del Museum of Modern Art de Nueva York',
      source: 'Wikimedia Commons',
      photoBy: 'Ming-yen Hsu',
      license: 'CC BY 2.0',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Guggenheim_Bilbao_Museoa.jpg',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Autorretrato_Goya_1815.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Autorretrato_Goya_1815.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Autorretrato_Goya_1815.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Autorretrato_Goya_1815.jpg',
      mimeType: 'image/jpeg',
      width: 2268,
      height: 3051,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Autorretrato de Francisco de Goya',
      source: 'Museo del Prado / Wikimedia Commons',
      photoBy: 'Francisco de Goya',
      license: 'Public domain / PD-Art',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
      mimeType: 'image/jpeg',
      width: 1197,
      height: 1795,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Louise_Bourgeois%2C_c._2000.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Louise_Bourgeois,_c._2000.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Louise_Bourgeois%2C_c._2000.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Louise_Bourgeois,_c._2000.jpg',
      mimeType: 'image/jpeg',
      width: 1054,
      height: 742,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'MEDIUM',
      alt: 'Retrato de Louise Bourgeois',
      source: 'Wikimedia Commons',
      photoBy: 'Tetsuo Harada',
      license: 'CC0',
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

  const miro = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Joan Miró', slug: 'joan-miro', summary: 'Artista catalán vinculado a surrealismo, signo, infancia visual y abstracción poética.', content: 'Joan Miró construyó un lenguaje de signos, cuerpos, estrellas y espacios abiertos entre surrealismo, juego y modernidad.', startYear: 1893, endYear: 1983 });
  await prisma.artistDetails.create({ data: { entityId: miro.id, country: 'España', city: 'Barcelona', birthYear: 1893, deathYear: 1983, disciplines: 'Pintura, Escultura, Cerámica', bioShort: 'Figura moderna entre surrealismo, signo y poética visual.', links: null } });

  const velazquez = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Diego Velázquez', slug: 'diego-velazquez', summary: 'Pintor barroco español clave para pensar poder, mirada y representación.', content: 'Velázquez transformó el retrato cortesano en una investigación sobre poder, presencia, mirada y artificio pictórico.', startYear: 1599, endYear: 1660 });
  await prisma.artistDetails.create({ data: { entityId: velazquez.id, country: 'España', city: 'Sevilla', birthYear: 1599, deathYear: 1660, disciplines: 'Pintura', bioShort: 'Maestro del Barroco español y de la representación del poder.', links: null } });

  const hopper = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Edward Hopper', slug: 'edward-hopper', summary: 'Pintor estadounidense de ciudad, soledad, espera y vida moderna.', content: 'Hopper convirtió arquitectura, luz y escenas cotidianas en imágenes de aislamiento y modernidad urbana.', startYear: 1882, endYear: 1967 });
  await prisma.artistDetails.create({ data: { entityId: hopper.id, country: 'Estados Unidos', city: 'Nyack', birthYear: 1882, deathYear: 1967, disciplines: 'Pintura, Grabado', bioShort: 'Pintor de la soledad urbana y la escena moderna.', links: null } });

  const bacon = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Francis Bacon', slug: 'francis-bacon', summary: 'Pintor de cuerpo, violencia, carne, encierro y angustia moderna.', content: 'Bacon trabaja la figura humana como cuerpo vulnerable, deformado y sometido a fuerzas de violencia psicológica.', startYear: 1909, endYear: 1992 });
  await prisma.artistDetails.create({ data: { entityId: bacon.id, country: 'Irlanda / Reino Unido', city: 'Dublin', birthYear: 1909, deathYear: 1992, disciplines: 'Pintura', bioShort: 'Pintor esencial para leer cuerpo, violencia y angustia moderna.', links: null } });

  const duchamp = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Marcel Duchamp', slug: 'marcel-duchamp', summary: 'Artista que transformó autoría, objeto, juego y definición de arte.', content: 'Duchamp desplaza el arte hacia idea, elección, ironía, deporte mental, juego y crítica institucional.', startYear: 1887, endYear: 1968 });
  await prisma.artistDetails.create({ data: { entityId: duchamp.id, country: 'Francia / Estados Unidos', city: 'Blainville-Crevon', birthYear: 1887, deathYear: 1968, disciplines: 'Objeto, Pintura, Conceptual', bioShort: 'Figura decisiva del ready-made y la crítica a la institución arte.', links: null } });

  const warhol = await createEntityWithOptionalPrimaryMedia({ type: 'ARTIST', title: 'Andy Warhol', slug: 'andy-warhol', summary: 'Artista del Pop Art asociado a consumo, celebridad, repetición y medios.', content: 'Warhol lee la cultura visual moderna desde la publicidad, la fama, la reproducción técnica y la superficie mediática.', startYear: 1928, endYear: 1987 });
  await prisma.artistDetails.create({ data: { entityId: warhol.id, country: 'Estados Unidos', city: 'Pittsburgh', birthYear: 1928, deathYear: 1987, disciplines: 'Pintura, Serigrafía, Cine', bioShort: 'Figura central del Pop Art y de la imagen mediática.', links: null } });

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
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/66/El_tres_de_mayo_de_1808_en_Madrid.jpg',
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
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
      sourcePageUrl: 'https://www.museoreinasofia.es/en/collection/artwork/guernica',
      mimeType: 'image/jpeg',
      width: 1000,
      height: 443,
      isVector: false,
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
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
      canonicalUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      sourcePageUrl: 'https://www.moma.org/collection/works/79018',
      mimeType: 'image/jpeg',
      provider: 'WIKIPEDIA',
      qualityTier: 'LOW',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Las_dos_Fridas.jpg',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Las_dos_Fridas.jpg',
      mimeType: 'image/jpeg',
      width: 750,
      height: 736,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'MEDIUM',
      alt: 'Las dos Fridas de Frida Kahlo',
      source: 'Wikimedia Commons / referencia visual',
      photoBy: 'Ed Uthman',
      license: 'CC BY 2.0',
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
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      canonicalUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      displayUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/NGC_Maman.JPG',
      sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:NGC_Maman.JPG',
      mimeType: 'image/jpeg',
      width: 1613,
      height: 1097,
      provider: 'WIKIMEDIA_COMMONS',
      qualityTier: 'HIGH',
      alt: 'Maman de Louise Bourgeois frente a la National Gallery of Canada',
      source: 'Wikimedia Commons',
      photoBy: 'Radagast',
      license: 'Public domain',
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

  const lasMeninas = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Las meninas', slug: 'las-meninas', summary: 'Obra de Velázquez sobre poder, mirada, representación y espacio cortesano.', content: 'Las meninas permite leer poder, infancia, mirada, artificio pictórico y representación política en el Barroco.', startYear: 1656, endYear: 1656, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: lasMeninas.id, authorNation: 'Española', technique: 'Óleo sobre lienzo', materials: 'Óleo', dimensions: null, location: 'Museo del Prado, Madrid', collection: 'Colección permanente', state: 'Conservada' } });

  const oldGuitarist = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'El viejo guitarrista', slug: 'el-viejo-guitarrista', summary: 'Obra del periodo azul de Picasso sobre vejez, pobreza, cuerpo y melancolía.', content: 'El viejo guitarrista conecta vejez, cuerpo, dolor, pobreza y música como imagen de vulnerabilidad moderna.', startYear: 1903, endYear: 1904, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: oldGuitarist.id, authorNation: 'Española', technique: 'Óleo sobre tabla', materials: 'Óleo', dimensions: null, location: 'Art Institute of Chicago', collection: 'Colección permanente', state: 'Conservada' } });

  const demoiselles = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Las señoritas de Avignon', slug: 'las-senoritas-de-avignon', summary: 'Obra clave de Picasso para cubismo, cuerpo, género y ruptura moderna.', content: 'Las señoritas de Avignon abre una lectura sobre cuerpo, género, violencia visual, máscara y nacimiento del cubismo.', startYear: 1907, endYear: 1907, contentLevel: 'ADVANCED' });
  await prisma.artworkDetails.create({ data: { entityId: demoiselles.id, authorNation: 'Española', technique: 'Óleo sobre lienzo', materials: 'Óleo', dimensions: null, location: 'MoMA, New York', collection: 'Colección permanente', state: 'Conservada' } });

  const carnivalHarlequin = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'El carnaval de Arlequín', slug: 'el-carnaval-de-arlequin', summary: 'Obra de Miró sobre juego, cuerpo, signo y espacio surrealista.', content: 'El carnaval de Arlequín conecta surrealismo, juventud visual, juego, cuerpo fragmentado y libertad imaginativa.', startYear: 1924, endYear: 1925, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: carnivalHarlequin.id, authorNation: 'Española', technique: 'Óleo sobre lienzo', materials: 'Óleo', dimensions: null, location: 'Albright-Knox Art Gallery', collection: 'Colección permanente', state: 'Conservada' } });

  const nighthawks = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Nighthawks', slug: 'nighthawks', summary: 'Escena urbana de Hopper sobre ciudad, noche, aislamiento y modernidad.', content: 'Nighthawks condensa ciudad, soledad, luz artificial, espera y cultura visual moderna.', startYear: 1942, endYear: 1942, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: nighthawks.id, authorNation: 'Estadounidense', technique: 'Óleo sobre lienzo', materials: 'Óleo', dimensions: null, location: 'Art Institute of Chicago', collection: 'Colección permanente', state: 'Conservada' } });

  const studyVelazquez = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Estudio según el retrato del papa Inocencio X', slug: 'estudio-papa-inocencio-x', summary: 'Bacon reinterpreta poder, cuerpo, grito y violencia psicológica.', content: 'La serie de Bacon sobre Inocencio X cruza poder, religión, cuerpo, encierro, miedo y violencia de la imagen.', startYear: 1953, endYear: 1953, contentLevel: 'ADVANCED' });
  await prisma.artworkDetails.create({ data: { entityId: studyVelazquez.id, authorNation: 'Irlandesa / británica', technique: 'Óleo sobre lienzo', materials: 'Óleo', dimensions: null, location: 'Colección privada / versiones en museo', collection: null, state: 'Conservada' } });

  const fountain = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Fountain', slug: 'fountain', summary: 'Ready-made de Duchamp que cuestiona autoría, objeto y museo.', content: 'Fountain transforma un objeto cotidiano en pregunta sobre arte, poder institucional, juego conceptual y cultura moderna.', startYear: 1917, endYear: 1917, contentLevel: 'ADVANCED' });
  await prisma.artworkDetails.create({ data: { entityId: fountain.id, authorNation: 'Francesa / estadounidense', technique: 'Ready-made', materials: 'Porcelana', dimensions: null, location: 'Réplicas en colecciones museísticas', collection: null, state: 'Original perdido' } });

  const marilynDiptych = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Marilyn Diptych', slug: 'marilyn-diptych', summary: 'Warhol sobre celebridad, repetición, muerte e imagen mediática.', content: 'Marilyn Diptych conecta Pop Art, muerte, fama, repetición técnica, consumo y cultura de masas.', startYear: 1962, endYear: 1962, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: marilynDiptych.id, authorNation: 'Estadounidense', technique: 'Acrílico y serigrafía', materials: 'Lienzo', dimensions: null, location: 'Tate', collection: 'Colección permanente', state: 'Conservada' } });

  const bottleRack = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Bottle Rack', slug: 'bottle-rack', summary: 'Ready-made de Duchamp sobre objeto, elección y gesto conceptual.', content: 'Bottle Rack permite pensar objeto encontrado, ciudad, consumo, juego intelectual y antiarte dadaísta.', startYear: 1914, endYear: 1914, contentLevel: 'INTERMEDIATE' });
  await prisma.artworkDetails.create({ data: { entityId: bottleRack.id, authorNation: 'Francesa / estadounidense', technique: 'Ready-made', materials: 'Metal', dimensions: null, location: 'Réplicas en museo', collection: null, state: 'Original perdido' } });

  const futbolistas = await createEntityWithOptionalPrimaryMedia({ type: 'ARTWORK', title: 'Futbolistas', slug: 'futbolistas', summary: 'Obra editorial de prueba para conectar arte, deporte, cuerpo y multitud.', content: 'Futbolistas funciona como nodo de prueba para leer arte en el fútbol: cuerpo, movimiento, competición, ciudad, juventud e identidad colectiva.', startYear: 1930, endYear: 1930, contentLevel: 'BASIC' });
  await prisma.artworkDetails.create({ data: { entityId: futbolistas.id, authorNation: 'Editorial', technique: 'Pintura / imagen deportiva', materials: null, dimensions: null, location: 'Dataset editorial JANO', collection: 'Arte y deporte', state: 'Referencia curatorial' } });

  const articleWar = await createEntityWithOptionalPrimaryMedia({ type: 'ARTICLE', title: 'Cómo mirar la guerra en el arte', slug: 'como-mirar-la-guerra-en-el-arte', summary: 'Una ruta editorial por guerra, violencia, memoria, Goya y Picasso.', content: 'Este artículo conecta Guernica, El tres de mayo, Saturno, guerra, violencia y memoria como ejes para leer la imagen moderna.', contentLevel: 'BASIC' });
  const articleBody = await createEntityWithOptionalPrimaryMedia({ type: 'ARTICLE', title: 'El cuerpo en el siglo XX', slug: 'el-cuerpo-en-el-siglo-xx', summary: 'De Frida Kahlo a Bacon y Bourgeois: cuerpo, dolor, género y memoria.', content: 'Una lectura del cuerpo moderno a través de identidad, dolor, género, maternidad, violencia y escultura contemporánea.', contentLevel: 'INTERMEDIATE' });
  const articleFootball = await createEntityWithOptionalPrimaryMedia({ type: 'ARTICLE', title: 'Arte y fútbol: cuerpo, ciudad y multitud', slug: 'arte-y-futbol-cuerpo-ciudad-y-multitud', summary: 'Una entrada a deporte y fútbol desde el cuerpo, el movimiento y la cultura de masas.', content: 'El fútbol permite conectar deporte, ciudad, juventud, cuerpo, identidad colectiva, espectáculo popular y cultura visual.', contentLevel: 'BASIC' });
  const articleDeath = await createEntityWithOptionalPrimaryMedia({ type: 'ARTICLE', title: 'Muerte y memoria visual', slug: 'muerte-y-memoria-visual', summary: 'Una lectura de muerte, memoria, religión, guerra y duelo en imágenes.', content: 'La muerte en arte se cruza con memoria, religión, violencia, guerra, vejez y rituales de permanencia visual.', contentLevel: 'INTERMEDIATE' });
  const articleAvant = await createEntityWithOptionalPrimaryMedia({ type: 'ARTICLE', title: 'Vanguardias modernas para empezar', slug: 'vanguardias-modernas-para-empezar', summary: 'Cubismo, surrealismo, dadaísmo y Pop Art como rutas de entrada.', content: 'Las vanguardias modernas conectan Picasso, Miró, Dalí, Duchamp y Warhol con cubismo, surrealismo, dadaísmo, ciudad y cultura de masas.', contentLevel: 'BASIC' });

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

  // Discovery v1: denser editorial graph for search.
  await rel(velazquez.id, barroco.id, 'BELONGS_TO_MOVEMENT', 1, 'Velázquez es una figura central del Barroco español.');
  await rel(warhol.id, popArt.id, 'BELONGS_TO_MOVEMENT', 1, 'Warhol es uno de los nombres clave del Pop Art.');
  await rel(duchamp.id, dadaismo.id, 'ASSOCIATED_WITH', 0.9, 'Duchamp es decisivo para la sensibilidad dadaísta y conceptual.');
  await rel(bacon.id, expresionismo.id, 'ASSOCIATED_WITH', 0.8, 'Bacon comparte una intensidad corporal cercana al expresionismo.');
  await rel(hopper.id, realismoAmericano.id, 'BELONGS_TO_MOVEMENT', 0.9, 'Hopper es una referencia del realismo americano.');
  await rel(miro.id, surrealismo.id, 'ASSOCIATED_WITH', 0.9, 'Miró dialoga con el surrealismo desde signo, juego y automatismo.');

  await rel(lasMeninas.id, velazquez.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(oldGuitarist.id, picasso.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(demoiselles.id, picasso.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(carnivalHarlequin.id, miro.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(nighthawks.id, hopper.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(studyVelazquez.id, bacon.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(fountain.id, duchamp.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(bottleRack.id, duchamp.id, 'CREATED_BY', 1, 'Autoría directa.');
  await rel(marilynDiptych.id, warhol.id, 'CREATED_BY', 1, 'Autoría directa.');

  await rel(lasMeninas.id, barroco.id, 'BELONGS_TO_MOVEMENT', 1, 'Obra clave del Barroco cortesano.');
  await rel(demoiselles.id, cubismo.id, 'BELONGS_TO_MOVEMENT', 0.95, 'Obra decisiva para el nacimiento del Cubismo.');
  await rel(carnivalHarlequin.id, surrealismo.id, 'BELONGS_TO_MOVEMENT', 0.85, 'Obra conectada al imaginario surrealista.');
  await rel(nighthawks.id, realismoAmericano.id, 'BELONGS_TO_MOVEMENT', 1, 'Icono del realismo urbano americano.');
  await rel(fountain.id, dadaismo.id, 'BELONGS_TO_MOVEMENT', 0.9, 'Ready-made decisivo para la ruptura dadaísta.');
  await rel(bottleRack.id, dadaismo.id, 'BELONGS_TO_MOVEMENT', 0.8, 'Objeto encontrado ligado a la sensibilidad dadaísta.');
  await rel(marilynDiptych.id, popArt.id, 'BELONGS_TO_MOVEMENT', 1, 'Obra emblemática del Pop Art.');

  await rel(lasMeninas.id, poder.id, 'ABOUT_CONCEPT', 1, 'La obra interroga representación, corte y autoridad.');
  await rel(lasMeninas.id, juventud.id, 'ABOUT_CONCEPT', 0.55, 'La infancia cortesana forma parte de su lectura.');
  await rel(oldGuitarist.id, vejez.id, 'ABOUT_CONCEPT', 1, 'La vejez estructura la imagen del cuerpo vulnerable.');
  await rel(oldGuitarist.id, dolor.id, 'ABOUT_CONCEPT', 0.8, 'La obra transmite melancolía y sufrimiento.');
  await rel(demoiselles.id, cuerpo.id, 'ABOUT_CONCEPT', 1, 'El cuerpo fragmentado es central.');
  await rel(demoiselles.id, genero.id, 'ABOUT_CONCEPT', 0.9, 'La representación de mujeres exige lectura de género.');
  await rel(carnivalHarlequin.id, juventud.id, 'ABOUT_CONCEPT', 0.65, 'Su energía visual conecta con juego e infancia.');
  await rel(nighthawks.id, ciudad.id, 'ABOUT_CONCEPT', 1, 'La ciudad nocturna estructura la escena.');
  await rel(nighthawks.id, memoria.id, 'ABOUT_CONCEPT', 0.45, 'La escena funciona como imagen persistente de modernidad.');
  await rel(studyVelazquez.id, poder.id, 'ABOUT_CONCEPT', 1, 'El papa es una imagen extrema del poder.');
  await rel(studyVelazquez.id, religion.id, 'ABOUT_CONCEPT', 0.9, 'La iconografía papal activa la lectura religiosa.');
  await rel(studyVelazquez.id, violencia.id, 'ABOUT_CONCEPT', 0.95, 'La figura aparece sometida a violencia psicológica.');
  await rel(studyVelazquez.id, cuerpo.id, 'ABOUT_CONCEPT', 0.85, 'El cuerpo queda deformado y atrapado.');
  await rel(fountain.id, poder.id, 'ABOUT_CONCEPT', 0.65, 'El gesto desafía el poder institucional del museo.');
  await rel(fountain.id, ciudad.id, 'ABOUT_CONCEPT', 0.45, 'El objeto cotidiano procede de cultura material urbana.');
  await rel(marilynDiptych.id, muerte.id, 'ABOUT_CONCEPT', 0.95, 'La repetición convive con la muerte de la celebridad.');
  await rel(marilynDiptych.id, ciudad.id, 'ABOUT_CONCEPT', 0.65, 'La cultura mediática urbana atraviesa la obra.');
  await rel(futbolistas.id, futbol.id, 'ABOUT_CONCEPT', 1, 'Nodo de entrada para arte y fútbol.');
  await rel(futbolistas.id, deporte.id, 'ABOUT_CONCEPT', 1, 'La obra se centra en cultura deportiva.');
  await rel(futbolistas.id, cuerpo.id, 'ABOUT_CONCEPT', 0.85, 'El cuerpo en movimiento es central.');
  await rel(futbolistas.id, ciudad.id, 'ABOUT_CONCEPT', 0.65, 'El fútbol se lee como ritual urbano y colectivo.');
  await rel(futbolistas.id, juventud.id, 'ABOUT_CONCEPT', 0.65, 'La energía física dialoga con juventud y competición.');

  await rel(muerte.id, memoria.id, 'RELATED_TO', 0.9, 'La muerte activa rituales de memoria.');
  await rel(muerte.id, religion.id, 'RELATED_TO', 0.8, 'La religión organiza imágenes de muerte y trascendencia.');
  await rel(vejez.id, tiempo.id, 'RELATED_TO', 0.9, 'La vejez es tiempo inscrito en el cuerpo.');
  await rel(vejez.id, muerte.id, 'RELATED_TO', 0.7, 'La vejez abre preguntas sobre finitud.');
  await rel(genero.id, cuerpo.id, 'RELATED_TO', 0.9, 'El género se representa a través del cuerpo.');
  await rel(deporte.id, cuerpo.id, 'RELATED_TO', 0.9, 'El deporte hace visible cuerpo y movimiento.');
  await rel(futbol.id, deporte.id, 'RELATED_TO', 1, 'El fútbol es una práctica deportiva y cultural.');
  await rel(futbol.id, ciudad.id, 'RELATED_TO', 0.75, 'El fútbol funciona como ritual urbano y multitudinario.');
  await rel(popArt.id, ciudad.id, 'ASSOCIATED_WITH', 0.75, 'El Pop Art emerge de cultura urbana y consumo.');
  await rel(dadaismo.id, poder.id, 'ASSOCIATED_WITH', 0.55, 'El Dadaísmo desafía poder cultural e institucional.');

  await rel(articleWar.id, guerra.id, 'ABOUT_CONCEPT', 1, 'Artículo dedicado a guerra en el arte.');
  await rel(articleWar.id, guernica.id, 'MENTIONS', 1, 'Guernica es un caso central.');
  await rel(articleWar.id, tresDeMayo.id, 'MENTIONS', 0.9, 'El tres de mayo es un caso central.');
  await rel(articleBody.id, cuerpo.id, 'ABOUT_CONCEPT', 1, 'Artículo dedicado al cuerpo moderno.');
  await rel(articleBody.id, genero.id, 'ABOUT_CONCEPT', 0.8, 'El género forma parte de la lectura del cuerpo.');
  await rel(articleFootball.id, futbol.id, 'ABOUT_CONCEPT', 1, 'Artículo dedicado a arte y fútbol.');
  await rel(articleFootball.id, deporte.id, 'ABOUT_CONCEPT', 0.9, 'El deporte es el marco principal.');
  await rel(articleDeath.id, muerte.id, 'ABOUT_CONCEPT', 1, 'Artículo dedicado a muerte y memoria.');
  await rel(articleDeath.id, memoria.id, 'ABOUT_CONCEPT', 0.85, 'La memoria articula la lectura.');
  await rel(articleAvant.id, cubismo.id, 'MENTIONS', 0.8, 'El Cubismo es una ruta de entrada.');
  await rel(articleAvant.id, surrealismo.id, 'MENTIONS', 0.8, 'El Surrealismo es una ruta de entrada.');
  await rel(articleAvant.id, dadaismo.id, 'MENTIONS', 0.8, 'El Dadaísmo es una ruta de entrada.');
  await rel(articleAvant.id, popArt.id, 'MENTIONS', 0.8, 'El Pop Art es una ruta de entrada.');

  const discoveryTags = [
    ['guerra', 'Guerra', [guerra, guernica, tresDeMayo, saturno, articleWar]],
    ['memoria', 'Memoria', [memoria, guernica, persistencia, maman, articleDeath]],
    ['cuerpo', 'Cuerpo', [cuerpo, dosFridas, maman, demoiselles, studyVelazquez, futbolistas, articleBody]],
    ['muerte', 'Muerte', [muerte, saturno, marilynDiptych, articleDeath]],
    ['identidad', 'Identidad', [identidad, frida, dosFridas, futbol, articleFootball]],
    ['deporte', 'Deporte', [deporte, futbol, futbolistas, articleFootball]],
    ['futbol', 'Fútbol', [futbol, futbolistas, articleFootball]],
    ['genero', 'Género', [genero, frida, dosFridas, demoiselles, articleBody]],
    ['ciudad', 'Ciudad', [ciudad, nighthawks, warhol, marilynDiptych, futbolistas]],
    ['vanguardias', 'Vanguardias', [cubismo, surrealismo, dadaismo, popArt, picasso, dali, miro, duchamp, warhol, articleAvant]],
  ] as const;

  for (const [slug, label, entities] of discoveryTags) {
    const tag = await prisma.tag.create({ data: { slug, label, category: 'discovery', isActive: true } });
    for (const entity of entities) {
      await prisma.entityTag.create({ data: { entityId: entity.id, tagId: tag.id, source: 'SEED', weight: 1 } });
    }
  }

  console.log('🌐 Seeding entity translations...');
  await seedEntityTranslations();
  await seedSourceTranslations();
  await seedRelationAndSourceRefTranslations();

  console.log('🧭 Creating home decks...');

  const homeDecks = [
    {
      slug: 'artwork',
      title: 'Obras',
      subtitle: 'Piezas clave',
      description: 'Piezas clave para estudiar forma, técnica, simbolismo y contexto.',
      ctaLabel: 'Explorar obras',
      ctaRoute: '/entities/artwork',
      imageUrl: '/assets/home/artwork.jpg',
      translations: {
        en: { title: 'Artworks', subtitle: 'Key pieces', description: 'Key pieces for studying form, technique, symbolism and context.', ctaLabel: 'Explore artworks' },
      },
      sortOrder: 0,
      entities: [guernica, persistencia, dosFridas, maman, saturno, tresDeMayo],
    },
    {
      slug: 'article',
      title: 'Artículos',
      subtitle: 'Lecturas editoriales',
      description: 'Lecturas editoriales, opinión y conexiones entre obras, autores e ideas.',
      ctaLabel: 'Explorar artículos',
      ctaRoute: '/entities/article',
      imageUrl: '/assets/home/concept.jpg',
      translations: {
        en: { title: 'Articles', subtitle: 'Editorial readings', description: 'Editorial readings, criticism and connections between works, authors and ideas.', ctaLabel: 'Explore articles' },
      },
      sortOrder: 1,
      entities: [],
    },
    {
      slug: 'artist',
      title: 'Artistas',
      subtitle: 'Trayectorias visuales',
      description: 'Autores, trayectorias, obsesiones visuales e influencias cruzadas.',
      ctaLabel: 'Explorar artistas',
      ctaRoute: '/entities/artist',
      imageUrl: '/assets/home/artist.jpg',
      translations: {
        en: { title: 'Artists', subtitle: 'Visual trajectories', description: 'Authors, careers, visual obsessions and crossed influences.', ctaLabel: 'Explore artists' },
      },
      sortOrder: 2,
      entities: [goya, picasso, dali, frida, bourgeois],
    },
    {
      slug: 'movement',
      title: 'Movimientos',
      subtitle: 'Ideas en movimiento',
      description: 'Corrientes estéticas e ideas que redefinieron la historia del arte.',
      ctaLabel: 'Explorar movimientos',
      ctaRoute: '/entities/movement',
      imageUrl: '/assets/home/movement.jpg',
      translations: {
        en: { title: 'Movements', subtitle: 'Ideas in motion', description: 'Aesthetic currents and ideas that redefined art history.', ctaLabel: 'Explore movements' },
      },
      sortOrder: 3,
      entities: [romanticismo, cubismo, surrealismo, arteModerno, arteContemporaneo],
    },
    {
      slug: 'period',
      title: 'Períodos',
      subtitle: 'Contexto histórico',
      description: 'Etapas históricas para entender cambios culturales y visuales.',
      ctaLabel: 'Explorar períodos',
      ctaRoute: '/entities/period',
      imageUrl: '/assets/home/period.jpg',
      translations: {
        en: { title: 'Periods', subtitle: 'Historical context', description: 'Historical stages for understanding cultural and visual change.', ctaLabel: 'Explore periods' },
      },
      sortOrder: 4,
      entities: [periodXIX, periodXX, periodXXI],
    },
    {
      slug: 'concept',
      title: 'Conceptos',
      subtitle: 'Claves de lectura',
      description: 'Ideas fundamentales para leer obras y relaciones con más claridad.',
      ctaLabel: 'Explorar conceptos',
      ctaRoute: '/entities/concept',
      imageUrl: '/assets/home/concept.jpg',
      translations: {
        en: { title: 'Concepts', subtitle: 'Reading keys', description: 'Foundational ideas for reading works and relationships with more clarity.', ctaLabel: 'Explore concepts' },
      },
      sortOrder: 5,
      entities: [tiempo, memoria, guerra, identidad, cuerpo, dolor, maternidad, violencia],
    },
  ];

  const recommendedDecks = [
    {
      slug: 'magia-en-el-arte',
      title: 'La magia en el arte',
      subtitle: 'Staff Pick',
      description: 'Una selección curada para entrar a Jano por piezas clave y conexiones fuertes.',
      ctaLabel: 'Ver selección',
      imageUrl: '/assets/home/artwork.jpg',
      translations: {
        en: { title: 'Magic in art', subtitle: 'Staff Pick', description: 'A curated selection to enter JANO through key works and strong connections.', ctaLabel: 'View selection' },
      },
      sortOrder: 0,
      entities: [persistencia, surrealismo, memoria, tiempo, identidad, cuerpo],
    },
    {
      slug: 'memoria-y-trauma',
      title: 'Memoria y trauma',
      subtitle: 'Curated List',
      description: 'Obras, conceptos y relaciones para leer la persistencia de la memoria histórica.',
      ctaLabel: 'Ver recorrido',
      imageUrl: '/assets/home/concept.jpg',
      translations: {
        en: { title: 'Memory and trauma', subtitle: 'Curated List', description: 'Works, concepts and relationships for reading the persistence of historical memory.', ctaLabel: 'View route' },
      },
      sortOrder: 1,
      entities: [guernica, guerra, violencia, memoria, tresDeMayo, saturno],
    },
    {
      slug: 'arte-y-guerra',
      title: 'Arte y guerra',
      subtitle: 'Ruta editorial',
      description: 'De Goya a Picasso: imágenes para pensar violencia, poder y memoria.',
      ctaLabel: 'Explorar ruta',
      imageUrl: '/assets/home/artwork.jpg',
      translations: { en: { title: 'Art and war', subtitle: 'Editorial route', description: 'From Goya to Picasso: images for thinking violence, power and memory.', ctaLabel: 'Explore route' } },
      sortOrder: 2,
      entities: [guernica, tresDeMayo, saturno, guerra, violencia, memoria, articleWar],
    },
    {
      slug: 'cuerpo-siglo-xx',
      title: 'El cuerpo en el siglo XX',
      subtitle: 'Ruta conceptual',
      description: 'Cuerpo, dolor, género y vulnerabilidad en la modernidad artística.',
      ctaLabel: 'Explorar cuerpos',
      imageUrl: '/assets/home/concept.jpg',
      translations: { en: { title: 'The body in the 20th century', subtitle: 'Concept route', description: 'Body, pain, gender and vulnerability in modern art.', ctaLabel: 'Explore bodies' } },
      sortOrder: 3,
      entities: [dosFridas, demoiselles, studyVelazquez, maman, cuerpo, dolor, genero, articleBody],
    },
    {
      slug: 'arte-y-deporte',
      title: 'Arte y deporte',
      subtitle: 'Cultura visual',
      description: 'Fútbol, cuerpo, ciudad y espectáculo popular como ruta de descubrimiento.',
      ctaLabel: 'Ver recorrido',
      imageUrl: '/assets/home/movement.jpg',
      translations: { en: { title: 'Art and sport', subtitle: 'Visual culture', description: 'Football, body, city and popular spectacle as a discovery route.', ctaLabel: 'View route' } },
      sortOrder: 4,
      entities: [futbolistas, futbol, deporte, cuerpo, ciudad, juventud, articleFootball],
    },
    {
      slug: 'muerte-y-memoria',
      title: 'Muerte y memoria',
      subtitle: 'Lectura simbólica',
      description: 'Finitud, duelo, religión y persistencia visual.',
      ctaLabel: 'Explorar memoria',
      imageUrl: '/assets/home/period.jpg',
      translations: { en: { title: 'Death and memory', subtitle: 'Symbolic reading', description: 'Finitude, mourning, religion and visual persistence.', ctaLabel: 'Explore memory' } },
      sortOrder: 5,
      entities: [muerte, memoria, religion, saturno, marilynDiptych, articleDeath],
    },
    {
      slug: 'vanguardias-modernas',
      title: 'Vanguardias modernas',
      subtitle: 'Mapa de entrada',
      description: 'Cubismo, surrealismo, dadaísmo y Pop Art conectados por artistas y obras.',
      ctaLabel: 'Explorar vanguardias',
      imageUrl: '/assets/home/movement.jpg',
      translations: { en: { title: 'Modern avant-gardes', subtitle: 'Entry map', description: 'Cubism, Surrealism, Dada and Pop Art connected through artists and works.', ctaLabel: 'Explore avant-gardes' } },
      sortOrder: 6,
      entities: [picasso, guernica, demoiselles, dali, persistencia, miro, carnivalHarlequin, duchamp, fountain, warhol, marilynDiptych, articleAvant],
    },
  ];

  for (const deck of homeDecks) {
    const createdDeck = await prisma.homeDeck.create({
      data: {
        slug: deck.slug,
        title: deck.title,
        subtitle: deck.subtitle,
        description: deck.description,
        ctaLabel: deck.ctaLabel,
        ctaRoute: deck.ctaRoute,
        imageUrl: deck.imageUrl,
        surface: 'HOME',
        sortOrder: deck.sortOrder,
        isActive: true,
        translations: {
          create: [
            { locale: 'es', title: deck.title, subtitle: deck.subtitle, description: deck.description, ctaLabel: deck.ctaLabel },
            { locale: 'en', title: deck.translations.en.title, subtitle: deck.translations.en.subtitle, description: deck.translations.en.description, ctaLabel: deck.translations.en.ctaLabel },
          ],
        },
      },
    });

    for (const [index, entity] of deck.entities.entries()) {
      await prisma.homeDeckItem.create({
        data: {
          deckId: createdDeck.id,
          entityId: entity.id,
          sortOrder: index,
        },
      });
    }
  }

  for (const deck of recommendedDecks) {
    const createdDeck = await prisma.homeDeck.create({
      data: {
        slug: deck.slug,
        title: deck.title,
        subtitle: deck.subtitle,
        description: deck.description,
        ctaLabel: deck.ctaLabel,
        imageUrl: deck.imageUrl,
        surface: 'RECOMMENDED',
        sortOrder: deck.sortOrder,
        isActive: true,
        translations: {
          create: [
            { locale: 'es', title: deck.title, subtitle: deck.subtitle, description: deck.description, ctaLabel: deck.ctaLabel },
            { locale: 'en', title: deck.translations.en.title, subtitle: deck.translations.en.subtitle, description: deck.translations.en.description, ctaLabel: deck.translations.en.ctaLabel },
          ],
        },
      },
    });

    for (const [index, entity] of deck.entities.entries()) {
      await prisma.homeDeckItem.create({
        data: {
          deckId: createdDeck.id,
          entityId: entity.id,
          sortOrder: index,
        },
      });
    }
  }

  console.log('🔐 Creating test user...');

  const testEmail = 'dev+tester@example.com';
  const testPassword = 'Secret123!';
  const testPasswordHash = await bcrypt.hash(testPassword, 10);

  await prisma.user.upsert({
    where: { email: testEmail },
    update: { passwordHash: testPasswordHash, name: 'Dev Tester', role: UserRole.ADMIN, isBeta: true },
    create: { email: testEmail, passwordHash: testPasswordHash, name: 'Dev Tester', role: UserRole.ADMIN, isBeta: true },
  });

  console.log(`Test user: ${testEmail} / ${testPassword}`);

  console.log('✅ Real art seed created successfully.');
  console.log('Entities created:');
  console.log('- 3 periods');
  console.log('- 5 movements');
  console.log('- 8 concepts');
  console.log('- 4 places');
  console.log('- 5 artists');
  console.log('- 6 artworks');
  console.log('- 6 home decks');
  console.log('- 2 recommended decks');
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
