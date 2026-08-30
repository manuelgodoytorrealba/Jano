import { MediaProvider, MediaQualityTier, PrismaClient, SourceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const apply = process.argv.includes('--apply');

type Correction = {
  slug: string;
  title: string;
  startYear: number;
  endYear: number;
  summaryEs: string;
  summaryEn: string;
  imageUrl: string;
  sourceUrl: string;
  sourceTitle: string;
  provider: MediaProvider;
  license: string;
  technique?: string;
  materials?: string;
  dimensions?: string;
  location?: string;
};

const corrections: Correction[] = [
  {
    slug: 'retrato-de-manuela',
    title: 'Black Draftee (James Hunter)',
    startYear: 1965,
    endYear: 1965,
    summaryEs:
      'Retrato inacabado pintado por Alice Neel en 1965. La ausencia del modelo tras la primera sesión convierte el lienzo incompleto en una reflexión sobre presencia, reclutamiento y memoria.',
    summaryEn:
      'An unfinished portrait painted by Alice Neel in 1965. The sitter’s absence after the first session turns the incomplete canvas into a reflection on presence, conscription, and memory.',
    imageUrl: 'https://customprints.metmuseum.org/vitruvius/render/1200/504633.jpg',
    sourceUrl: 'https://www.metmuseum.org/exhibitions/listings/2016/unfinished',
    sourceTitle: 'Alice Neel, James Hunter Black Draftee, 1965 — The Met',
    provider: MediaProvider.MUSEUM,
    license: '© The Estate of Alice Neel',
    technique: 'Pintura al óleo',
    materials: 'Óleo sobre lienzo',
    dimensions: '152,4 × 101,6 cm',
    location: 'COMMA Foundation, Bélgica',
  },
  {
    slug: 'lunar-caustic',
    title: 'DADA soulève tout',
    startYear: 1921,
    endYear: 1921,
    summaryEs:
      'Hoja tipográfica dadaísta publicada en París en enero de 1921 y firmada por Tristan Tzara junto a otros miembros de la vanguardia internacional.',
    summaryEn:
      'A Dada letterpress sheet published in Paris in January 1921 and signed by Tristan Tzara alongside other members of the international avant-garde.',
    imageUrl: '/assets/entities/dada-souleve-tout.jpg',
    sourceUrl: 'https://www.moma.org/collection/works/184054',
    sourceTitle: 'Tristan Tzara, DADA soulève tout, 1921 — MoMA',
    provider: MediaProvider.MUSEUM,
    license: '© Christophe Tzara; educational reference crop',
    technique: 'Impresión tipográfica',
    materials: 'Tinta sobre papel',
    dimensions: '27,4 × 21 cm',
    location: 'Museum of Modern Art, Nueva York',
  },
  {
    slug: 'giambattista-tiepolo',
    title: 'Giambattista Tiepolo',
    startYear: 1696,
    endYear: 1770,
    summaryEs:
      'Pintor y grabador veneciano, figura central del rococó europeo, célebre por sus frescos monumentales y composiciones luminosas.',
    summaryEn:
      'Venetian painter and printmaker, a central figure of European Rococo, renowned for monumental frescoes and luminous compositions.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/84/Tiepolo_selfportrait_in_the_Triumph_of_Marius.jpg',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Tiepolo_selfportrait_in_the_Triumph_of_Marius.jpg',
    sourceTitle: 'Autorretrato de Giambattista Tiepolo — Wikimedia Commons',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Public Domain Mark 1.0',
  },
  {
    slug: 'futbolistas',
    title: 'Las futbolistas',
    startYear: 1922,
    endYear: 1922,
    summaryEs:
      'Composición de Ángel Zárraga dedicada a mujeres futbolistas, un motivo excepcional en la pintura moderna de comienzos del siglo XX.',
    summaryEn:
      'A composition by Ángel Zárraga devoted to women footballers, an exceptional subject in early twentieth-century modern painting.',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/2/21/Angel_Zarraga%2C_Las_Futbolistas%2C_Museo_de_Arte_Moderno.jpg',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Angel_Zarraga,_Las_Futbolistas,_Museo_de_Arte_Moderno.jpg',
    sourceTitle: 'Ángel Zárraga, Las futbolistas — Wikimedia Commons / Museo de Arte Moderno',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Public domain',
    technique: 'Pintura',
    materials: 'Óleo sobre lienzo',
    location: 'Museo de Arte Moderno, Ciudad de México',
  },
  {
    slug: 'fleshly-sight',
    title: 'Flesh Flush',
    startYear: 2004,
    endYear: 2004,
    summaryEs:
      'Serie sobre papel de Shahzia Sikander realizada con tinta y gouache, donde la tradición miniaturista se transforma mediante fragmentación, repetición y mutación corporal.',
    summaryEn:
      'A series on paper by Shahzia Sikander in ink and gouache, transforming miniature traditions through fragmentation, repetition, and bodily mutation.',
    imageUrl:
      'https://static-assets.artlogic.net/w_2000,h_2000,c_limit/exhibit-e/5a6f811a6aa72c6c268b4568/318e29ed39a7da6f7849b640a0aea72c.jpeg',
    sourceUrl: 'https://www.shahziasikander.com/artworks/flesh-flush',
    sourceTitle: 'Shahzia Sikander, Flesh Flush, 2004 — artist website',
    provider: MediaProvider.UNKNOWN,
    license: '© Shahzia Sikander',
    technique: 'Tinta y gouache',
    materials: 'Tinta y gouache sobre papel',
    dimensions: '38,1 × 30,5 cm cada pieza',
  },
  {
    slug: '_draft-6ee6b32e-f41d-4664-bd31-f66f2bcd99fa',
    title: 'How We Would Give Birth',
    startYear: 2007,
    endYear: 2007,
    summaryEs:
      'Pintura de Dana Schutz que imagina el parto mediante una figuración deliberadamente intensa y fragmentada.',
    summaryEn:
      'A painting by Dana Schutz imagining childbirth through deliberately intense and fragmented figuration.',
    imageUrl:
      'https://cdn.sanity.io/images/juzvn5an/release-adp/a3fd2fdde2ee9523181e11e55eece3ba4b28f69f-3000x2633.jpg?w=1600&auto=format',
    sourceUrl: 'https://www.davidzwirner.com/artworks/dana-schutz-how-we-would-give-birth-ac493',
    sourceTitle: 'Dana Schutz, How We Would Give Birth, 2007 — David Zwirner',
    provider: MediaProvider.UNKNOWN,
    license: '© Dana Schutz; courtesy David Zwirner',
    technique: 'Pintura al óleo',
    materials: 'Óleo sobre lienzo',
    dimensions: '152,4 × 182,9 cm',
  },
  {
    slug: 'cuerpo-como-archivo',
    title: 'The Body as Archive',
    startYear: 2000,
    endYear: 2000,
    summaryEs:
      'Proyecto fotográfico de Paul Solomon que emplea luz ultravioleta y retrato para interrogar la lectura social del color de la piel y la identidad birracial.',
    summaryEn:
      'Paul Solomon’s photographic project uses ultraviolet light and portraiture to question social readings of skin color and biracial identity.',
    imageUrl:
      'https://static1.squarespace.com/static/5ff898270806a1231b1637be/604556f82dd96a14719a7347/604556f82dd96a14719a737d/1625767961049/bi_racial_biracial_1.jpg?format=1500w',
    sourceUrl: 'https://www.paulrsolomon.com/photography/the-body-as-archive',
    sourceTitle: 'Paul Solomon, The Body as Archive — artist website',
    provider: MediaProvider.UNKNOWN,
    license: '© Paul Solomon',
    technique: 'Fotografía',
    materials: 'Fotografía en color con aplicación de luz ultravioleta',
  },
  {
    slug: 'blue-print',
    title: 'Blind Collage (Seven 180° Rotations)',
    startYear: 2021,
    endYear: 2021,
    summaryEs:
      'Collage de Walead Beshty construido mediante rotaciones de un periódico japonés, cinta y pan de oro de 22 quilates.',
    summaryEn:
      'A collage by Walead Beshty constructed through rotations of a Japanese newspaper, tape, and 22-karat gold leaf.',
    imageUrl:
      'https://static-assets.artlogic.net/w_2000,h_2000,c_limit/exhibit-e/6160a2395aac733b8c3c1163/ba43920ef5a2c493fff611fa3b051dfd.jpeg',
    sourceUrl: 'https://www.presenhuber.com/artists/walead-beshty',
    sourceTitle: 'Walead Beshty, Blind Collage, 2021 — Galerie Eva Presenhuber',
    provider: MediaProvider.UNKNOWN,
    license: '© Walead Beshty',
    technique: 'Collage',
    materials: 'Periódico, cinta y pan de oro de 22 quilates',
    dimensions: '81 × 54,5 cm',
  },
  {
    slug: 'modern-magic',
    title: '2000',
    startYear: 2018,
    endYear: 2018,
    summaryEs:
      'Instalación de Henrike Naumann que examina la reunificación alemana y la persistencia ideológica del diseño posmoderno mediante muebles, objetos y vídeo.',
    summaryEn:
      'Henrike Naumann’s installation examines German reunification and the ideological afterlife of postmodern design through furniture, objects, and video.',
    imageUrl:
      'https://henrikenaumann.com/wp-content/uploads/2018/03/04_Henrike-Naumann_2000_2018_Museum-Abteiberg-Mo%CC%88nchengladbach_by-Achim-Kukulies-scaled.jpg',
    sourceUrl: 'https://henrikenaumann.com/work/2000/',
    sourceTitle: 'Henrike Naumann, 2000 — artist website',
    provider: MediaProvider.UNKNOWN,
    license: '© Henrike Naumann; photo Achim Kukulies',
    technique: 'Instalación multimedia',
    materials: 'Mobiliario, objetos, vídeo y sonido',
    dimensions: 'Dimensiones variables',
    location: 'Museum Abteiberg, Mönchengladbach',
  },
  {
    slug: 'la-boca-del-tiempo',
    title: 'La Bouche du Roi',
    startYear: 1997,
    endYear: 2000,
    summaryEs:
      'Instalación de Romuald Hazoumè compuesta por 304 máscaras realizadas con bidones de gasolina y organizada según el diagrama del barco esclavista Brookes.',
    summaryEn:
      'Romuald Hazoumè’s installation comprises 304 masks made from petrol cans and arranged after the diagram of the slave ship Brookes.',
    imageUrl:
      'https://d3ir5jsauc24hh.cloudfront.net/FBDFAA0E-8FEA-47B1-B02248C6863165A4/e954e717c0aea0e80ca19036a32011ef-md.jpg',
    sourceUrl: 'https://www.britishmuseum.org/collection/object/E_Af2006-20-1',
    sourceTitle: 'Romuald Hazoumè, La Bouche du Roi — British Museum',
    provider: MediaProvider.MUSEUM,
    license: '© Romuald Hazoumè; image Art Fund',
    technique: 'Instalación multimedia',
    materials: 'Bidones de plástico, metal, sonido y vídeo',
    dimensions: 'Instalación de 304 máscaras',
    location: 'British Museum, Londres',
  },
  {
    slug: 'marilyn-diptych',
    title: 'Marilyn Diptych',
    startYear: 1962,
    endYear: 1962,
    summaryEs:
      'Díptico de Andy Warhol formado por cincuenta impresiones serigráficas de Marilyn Monroe que confronta celebridad, repetición y mortalidad.',
    summaryEn:
      'Andy Warhol’s diptych of fifty silkscreened images of Marilyn Monroe confronts celebrity, repetition, and mortality.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/87/Marilyndiptych.jpg',
    sourceUrl: 'https://www.tate.org.uk/art/artworks/warhol-marilyn-diptych-t03093',
    sourceTitle: 'Andy Warhol, Marilyn Diptych, 1962 — Tate',
    provider: MediaProvider.MUSEUM,
    license: '© The Andy Warhol Foundation for the Visual Arts',
    technique: 'Acrílico y serigrafía',
    materials: 'Acrílico y tinta serigráfica sobre lienzo',
    dimensions: '205,4 × 289,6 cm',
    location: 'Tate Modern, Londres',
  },
  {
    slug: 'no-linear-narrative',
    title: 'The Lightning Testimonies',
    startYear: 2007,
    endYear: 2007,
    summaryEs:
      'Videoinstalación de ocho canales de Amar Kanwar que reúne testimonios sobre violencia sexual, memoria, resistencia y conflicto en el subcontinente indio.',
    summaryEn:
      'Amar Kanwar’s eight-channel video installation brings together testimonies on sexual violence, memory, resistance, and conflict in the Indian subcontinent.',
    imageUrl:
      'https://static-assets.artlogic.net/w_1600,h_1200,c_limit/ws-mariangoodman/usr/images/news/main_image/items/db/dbba3917f97e4985aec6911f269a1ce0/kanwarthelightningtestimonies3.jpg',
    sourceUrl: 'https://www.metmuseum.org/art/collection/search/755092',
    sourceTitle: 'Amar Kanwar, The Lightning Testimonies, 2007 — The Met',
    provider: MediaProvider.MUSEUM,
    license: '© Amar Kanwar; courtesy Marian Goodman Gallery',
    technique: 'Videoinstalación',
    materials: 'Vídeo digital de ocho canales, color y blanco y negro, sonido',
    dimensions: '32 min 31 s; dimensiones variables',
    location: 'Metropolitan Museum of Art, Nueva York',
  },
];

async function main() {
  console.log(
    JSON.stringify(
      { apply, corrections: corrections.map(({ slug, title }) => ({ slug, title })) },
      null,
      2,
    ),
  );
  if (!apply) return;
  for (const item of corrections) {
    const entity = await prisma.entity.findUniqueOrThrow({
      where: { slug: item.slug },
      include: { mediaLinks: { include: { media: true } } },
    });
    await prisma.$transaction(async (tx) => {
      await tx.entity.update({
        where: { id: entity.id },
        data: {
          title: item.title,
          startYear: item.startYear,
          endYear: item.endYear,
          summary: item.summaryEs,
        },
      });
      await tx.entityTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        create: {
          entityId: entity.id,
          locale: 'es',
          title: item.title,
          shortDescription: item.summaryEs,
          essay: item.summaryEs,
        },
        update: { title: item.title, shortDescription: item.summaryEs, essay: item.summaryEs },
      });
      await tx.entityTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
        create: {
          entityId: entity.id,
          locale: 'en',
          title: item.title,
          shortDescription: item.summaryEn,
          essay: item.summaryEn,
        },
        update: { title: item.title, shortDescription: item.summaryEn, essay: item.summaryEn },
      });
      if (entity.type === 'ARTWORK')
        await tx.artworkDetails.upsert({
          where: { entityId: entity.id },
          create: {
            entityId: entity.id,
            technique: item.technique,
            materials: item.materials,
            dimensions: item.dimensions,
            location: item.location,
          },
          update: {
            technique: item.technique,
            materials: item.materials,
            dimensions: item.dimensions,
            location: item.location,
          },
        });
      const fallback =
        entity.mediaLinks.find((link) => link.media.source?.includes('fallback editorial')) ??
        entity.mediaLinks[0];
      if (!fallback) throw new Error(`No media link for ${item.slug}`);
      await tx.media.update({
        where: { id: fallback.mediaId },
        data: {
          url: item.imageUrl,
          displayUrl: item.imageUrl,
          canonicalUrl: item.imageUrl,
          sourcePageUrl: item.sourceUrl,
          source: item.sourceTitle,
          alt: item.title,
          license: item.license,
          provider: item.provider,
          qualityTier: MediaQualityTier.HIGH,
        },
      });
      await tx.sourceRef.deleteMany({ where: { entityId: entity.id } });
      const source = await tx.source.create({
        data: {
          type: SourceType.WEBSITE,
          title: item.sourceTitle,
          publisher: new URL(item.sourceUrl).hostname,
          url: item.sourceUrl,
        },
      });
      await tx.sourceRef.create({
        data: {
          entityId: entity.id,
          sourceId: source.id,
          note: 'Fuente de autoridad utilizada para identidad, ficha e imagen específica.',
        },
      });
    });
  }
  console.log(`Applied ${corrections.length} verified entity and media corrections.`);
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
