import { PrismaClient, KnowledgeAssertionStatus, KnowledgeEntityKind } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { entities, relations } from './foundational/catalog';
import { validateCatalog } from './foundational/validate-catalog';

const SOURCES = [
  {
    key: 'prado',
    title: 'Colección del Museo Nacional del Prado',
    publisher: 'Museo Nacional del Prado',
    url: 'https://www.museodelprado.es/en/the-collection',
  },
  {
    key: 'louvre',
    title: 'Collections',
    publisher: 'Musée du Louvre',
    url: 'https://collections.louvre.fr/en/',
  },
  {
    key: 'moma',
    title: 'Collection',
    publisher: 'The Museum of Modern Art',
    url: 'https://www.moma.org/collection/',
  },
  {
    key: 'met',
    title: 'The Met Collection',
    publisher: 'The Metropolitan Museum of Art',
    url: 'https://www.metmuseum.org/art/collection',
  },
  {
    key: 'tate',
    title: 'Art Terms and Collection',
    publisher: 'Tate',
    url: 'https://www.tate.org.uk/art',
  },
] as const;

const RETIRED_AUTHORSHIPS: ReadonlyArray<readonly [string, string]> = [
  ['mezquita-azul', 'arte-islamico'],
  ['palacio-de-versailles', 'rococo'],
  ['puerta-de-ishtar', 'aristoteles'],
  ['codigo-de-hammurabi', 'aristoteles'],
  ['discobolo', 'aristoteles'],
  ['teatro-de-epidauro', 'sophocles'],
  ['augusto-de-prima-porta', 'vitruvio'],
  ['columna-de-trajano', 'vitruvio'],
  ['icono-de-cristo-pantocrator', 'dionisio'],
  ['mezquita-de-samarra', 'aristoteles'],
  ['objeto-para-ser-destruido', 'meret-oppenheim'],
  ['cuerpo-como-archivo', 'cindy-sherman'],
  ['shibboleth', 'shirin-neshat'],
  ['la-corriente-del-golfo', 'homer'],
  ['otobong-nkanga', 'geta-bratescu'],
];
const RETIRED_RELATIONS: ReadonlyArray<readonly [string, string, string]> = [
  ['instituto-de-arte-chicago', 'nueva-york', 'LOCATED_IN'],
  ['partenon', 'marmol', 'USES_MATERIAL'],
  ['panteon-de-roma', 'marmol', 'USES_MATERIAL'],
  ['hagia-sophia', 'marmol', 'USES_MATERIAL'],
  ['gran-mezquita-de-cordoba', 'marmol', 'USES_MATERIAL'],
  ['catedral-de-chartres', 'marmol', 'USES_MATERIAL'],
  ['gran-mezquita-de-djenne', 'marmol', 'USES_MATERIAL'],
  ['gran-mezquita-de-djenne', 'hormigon', 'ABOUT_CONCEPT'],
  ['gran-mezquita-de-djenne', 'vidrio', 'ABOUT_CONCEPT'],
];
const RETIRED_ENTITY_SLUGS = ['toledo-espanol'] as const;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const kindByType: Record<(typeof entities)[number]['type'], KnowledgeEntityKind> = {
  ARTIST: 'PERSON',
  PERSON: 'PERSON',
  ARTWORK: 'WORK',
  CONCEPT: 'ABSTRACTION',
  MOVEMENT: 'ABSTRACTION',
  PERIOD: 'ABSTRACTION',
  PLACE: 'PLACE',
  ORGANIZATION: 'ORGANIZATION',
  EVENT: 'EVENT',
};

async function main() {
  validateCatalog();
  const ids = new Map<string, string>();
  for (const slug of RETIRED_ENTITY_SLUGS) {
    const retired = await prisma.entity.findUnique({ where: { slug }, select: { id: true } });
    if (retired) {
      await prisma.relation.deleteMany({
        where: { OR: [{ fromId: retired.id }, { toId: retired.id }] },
      });
      await prisma.entity.delete({ where: { id: retired.id } });
    }
  }
  for (const item of entities) {
    const entity = await prisma.entity.upsert({
      where: { slug: item.slug },
      update: {
        type: item.type,
        kind: kindByType[item.type],
        title: item.title,
        startYear: item.startYear ?? null,
        endYear: item.endYear ?? null,
        status: 'PUBLISHED',
        contentLevel: item.tier === 'A' ? 'INTERMEDIATE' : 'BASIC',
      },
      create: {
        type: item.type,
        kind: kindByType[item.type],
        title: item.title,
        slug: item.slug,
        startYear: item.startYear ?? null,
        endYear: item.endYear ?? null,
        status: 'PUBLISHED',
        contentLevel: item.tier === 'A' ? 'INTERMEDIATE' : 'BASIC',
      },
    });
    ids.set(item.slug, entity.id);
    await prisma.entityTranslation.upsert({
      where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
      // Foundational reseeds own identity, never human editorial work.
      update: { title: item.title },
      create: {
        entityId: entity.id,
        locale: 'es',
        title: item.title,
        shortDescription: item.summary ?? null,
      },
    });
    await prisma.entityTranslation.upsert({
      where: { entityId_locale: { entityId: entity.id, locale: 'en' } },
      update: { title: item.en },
      create: { entityId: entity.id, locale: 'en', title: item.en },
    });
    for (const value of item.aliases ?? []) {
      await prisma.entityAlias.upsert({
        where: {
          entityId_locale_kind_value: {
            entityId: entity.id,
            locale: 'und',
            kind: 'COMMON_NAME',
            value,
          },
        },
        update: {},
        create: {
          entityId: entity.id,
          locale: 'und',
          kind: 'COMMON_NAME',
          value,
          source: 'FOUNDATIONAL_SEED',
        },
      });
    }
  }
  const types = new Map(
    (await prisma.relationType.findMany({ select: { id: true, key: true } })).map((type) => [
      type.key,
      type.id,
    ]),
  );
  const createdByTypeId = types.get('CREATED_BY');
  const partOfTypeId = types.get('PART_OF');
  const representationId = ids.get('representacion');
  if (partOfTypeId && representationId)
    await prisma.relation.deleteMany({
      where: { toId: representationId, relationTypeId: partOfTypeId },
    });
  if (createdByTypeId)
    for (const [from, to] of RETIRED_AUTHORSHIPS) {
      const fromId = ids.get(from);
      const toId = ids.get(to);
      if (fromId && toId)
        await prisma.relation.deleteMany({
          where: { fromId, toId, relationTypeId: createdByTypeId },
        });
    }
  for (const [from, to, type] of RETIRED_RELATIONS) {
    const fromId = ids.get(from);
    const toId = ids.get(to);
    const relationTypeId = types.get(type);
    if (fromId && toId && relationTypeId)
      await prisma.relation.deleteMany({ where: { fromId, toId, relationTypeId } });
  }
  const sourceIds = new Map<string, string>();
  for (const source of SOURCES) {
    const existing = await prisma.source.findFirst({
      where: { url: source.url },
      select: { id: true },
    });
    const record =
      existing ??
      (await prisma.source.create({
        data: {
          type: 'CATALOG',
          title: source.title,
          publisher: source.publisher,
          url: source.url,
        },
      }));
    sourceIds.set(source.key, record.id);
  }
  for (const edge of relations) {
    const fromId = ids.get(edge.from)!;
    const toId = ids.get(edge.to)!;
    const relationTypeId = types.get(edge.type);
    if (!relationTypeId) throw new Error(`Unknown relation type ${edge.type}`);
    const existing = await prisma.relation.findFirst({
      where: { fromId, toId, relationTypeId },
      select: { id: true },
    });
    if (existing) {
      await prisma.relation.update({
        where: { id: existing.id },
        data: {
          status: KnowledgeAssertionStatus.PUBLISHED,
          justification: edge.justification ?? null,
        },
      });
    } else {
      await prisma.relation.create({
        data: {
          fromId,
          toId,
          relationTypeId,
          status: KnowledgeAssertionStatus.PUBLISHED,
          justification: edge.justification,
        },
      });
    }
  }
  const provenance = [
    ['las-meninas', 'prado'],
    ['tres-de-mayo-1808', 'prado'],
    ['saturno-devorando-a-su-hijo', 'prado'],
    ['mona-lisa', 'louvre'],
    ['diptico-marilyn', 'tate'],
    ['guernica', 'moma'],
    ['el-nacimiento-de-venus', 'uffizi'],
    ['venus-de-urbino', 'uffizi'],
    ['escuela-de-atenas', 'uffizi'],
    ['joven-de-la-perla', 'met'],
    ['ronda-de-noche', 'tate'],
    ['olympia', 'tate'],
    ['impresion-sol-naciente', 'moma'],
    ['noche-estrellada', 'moma'],
    ['las-senoritas-de-avignon', 'moma'],
    ['diptico-marilyn', 'tate'],
    ['maman', 'tate'],
    ['gran-ola-de-kanagawa', 'met'],
    ['david-de-miguel-angel', 'uffizi'],
    ['el-pensador', 'met'],
    ['guernica', 'moma'],
    ['partenon', 'louvre'],
    ['busto-de-nefertiti', 'louvre'],
    ['laocoonte', 'louvre'],
    ['panteon-de-roma', 'louvre'],
    ['vision-despues-del-sermon', 'tate'],
    ['la-danza-matisse', 'moma'],
    ['violin-y-candela', 'moma'],
    ['villa-savoye', 'tate'],
    ['los-diez-mayores', 'tate'],
    ['jimson-weed', 'moma'],
    ['retrato-de-giovanni-arnolfini', 'tate'],
    ['melancolia-i', 'met'],
    ['cazadores-en-la-nieve', 'met'],
    ['elevacion-de-la-cruz', 'met'],
    ['judith-y-su-doncella', 'met'],
    ['el-pie-zambo', 'louvre'],
    ['inmaculada-de-soult', 'louvre'],
    ['el-anciano-de-los-dias', 'tate'],
    ['el-carro-de-heno', 'tate'],
    ['la-feria-de-caballos', 'met'],
    ['la-cuna', 'tate'],
    ['el-bano-del-nino', 'met'],
    ['autorretrato-con-linterna', 'tate'],
    ['calle-de-berlin', 'moma'],
    ['maquina-de-trinar', 'tate'],
    ['prismas-electricos', 'tate'],
    ['corte-con-el-cuchillo-de-cocina', 'moma'],
    ['pajaro-en-el-espacio', 'met'],
    ['contingente', 'tate'],
    ['sin-titulo-judd', 'moma'],
    ['dibujo-mural-118', 'tate'],
    ['amistad', 'tate'],
    ['tierra-desarrollando-mas-raices', 'tate'],
    ['felix-en-el-exilio', 'moma'],
    ['dorchester-projects', 'tate'],
    ['antropofagia', 'moma'],
    ['creacion-de-las-aves', 'tate'],
    ['eco-de-un-grito', 'moma'],
    ['la-corriente-del-golfo', 'met'],
    ['la-anunciacion-fra-angelico', 'uffizi'],
    ['madame-de-pompadour', 'louvre'],
    ['jupiter-y-semele', 'louvre'],
    ['el-pequeno-camello', 'tate'],
    ['autorretrato-manuela-ballester', 'moma'],
    ['museo-de-ningbo', 'tate'],
    ['fuente', 'moma'],
    ['cuadrado-negro', 'moma'],
    ['composicion-viii', 'moma'],
  ] as const;
  for (const [slug, sourceKey] of provenance) {
    const entityId = ids.get(slug);
    const sourceId = sourceIds.get(sourceKey);
    if (!entityId || !sourceId) continue;
    const existing = await prisma.sourceRef.findFirst({
      where: { entityId, sourceId },
      select: { id: true },
    });
    if (!existing)
      await prisma.sourceRef.create({
        data: {
          entityId,
          sourceId,
          note: 'Institutional collection reference; metadata remains intentionally concise.',
        },
      });
  }
  console.log(
    `Foundational Knowledge Core seeded: ${entities.length} entities, ${relations.length} relations.`,
  );
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
