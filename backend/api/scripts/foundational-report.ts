import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { foundationalExpectations } from '../prisma/foundational/catalog';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const by = <T>(items: T[], key: (item: T) => string | null | undefined) =>
  Object.fromEntries(
    Object.entries(
      items.reduce<Record<string, number>>((all, item) => {
        const value = key(item);
        if (value) all[value] = (all[value] ?? 0) + 1;
        return all;
      }, {}),
    ).sort(),
  );

async function main() {
  const [
    entities,
    relations,
    research,
    publishedResearch,
    articles,
    collections,
    users,
    sourceRefs,
    translations,
    aliases,
  ] = await Promise.all([
    prisma.entity.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        kind: true,
        startYear: true,
        endYear: true,
      },
    }),
    prisma.relation.findMany({
      select: { fromId: true, toId: true, relationType: { select: { key: true } } },
    }),
    prisma.researchProject.count(),
    prisma.researchProject.count({ where: { status: 'PUBLISHED' } }),
    prisma.entity.count({ where: { type: 'ARTICLE' } }),
    prisma.collection.count(),
    prisma.user.count(),
    prisma.sourceRef.count(),
    prisma.entityTranslation.findMany({ select: { entityId: true, locale: true } }),
    prisma.entityAlias.findMany({ select: { entityId: true, value: true, locale: true } }),
  ]);
  const ids = new Set(entities.map((item) => item.id));
  const degree = new Map<string, number>(entities.map((item) => [item.id, 0]));
  const adjacency = new Map<string, Set<string>>(entities.map((item) => [item.id, new Set()]));
  const incoming = new Map<string, Map<string, number>>();
  const outgoing = new Map<string, Map<string, number>>();
  const relationCounts = new Map<string, number>();
  const duplicateEdges = new Set<string>();
  const seenEdges = new Set<string>();
  let broken = 0;
  for (const edge of relations) {
    if (!ids.has(edge.fromId) || !ids.has(edge.toId)) broken++;
    degree.set(edge.fromId, (degree.get(edge.fromId) ?? 0) + 1);
    degree.set(edge.toId, (degree.get(edge.toId) ?? 0) + 1);
    adjacency.get(edge.fromId)?.add(edge.toId);
    adjacency.get(edge.toId)?.add(edge.fromId);
    relationCounts.set(edge.relationType.key, (relationCounts.get(edge.relationType.key) ?? 0) + 1);
    const target = incoming.get(edge.toId) ?? new Map<string, number>();
    target.set(edge.relationType.key, (target.get(edge.relationType.key) ?? 0) + 1);
    incoming.set(edge.toId, target);
    const source = outgoing.get(edge.fromId) ?? new Map<string, number>();
    source.set(edge.relationType.key, (source.get(edge.relationType.key) ?? 0) + 1);
    outgoing.set(edge.fromId, source);
    const key = `${edge.fromId}:${edge.relationType.key}:${edge.toId}`;
    if (seenEdges.has(key)) duplicateEdges.add(key);
    seenEdges.add(key);
  }
  const values = [...degree.values()].sort((a, b) => a - b);
  const visited = new Set<string>();
  const components: number[] = [];
  for (const entity of entities) {
    if (visited.has(entity.id)) continue;
    const queue = [entity.id];
    visited.add(entity.id);
    let size = 0;
    while (queue.length) {
      const id = queue.pop()!;
      size++;
      for (const next of adjacency.get(id) ?? [])
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
    }
    components.push(size);
  }
  components.sort((a, b) => b - a);
  const titleGroups = new Map<string, string[]>();
  for (const entity of entities) {
    const key = normalize(entity.title);
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), entity.slug]);
  }
  const suspiciousDuplicates = [...titleGroups.values()].filter((slugs) => slugs.length > 1);
  const missing = foundationalExpectations.filter(
    (slug) => !entities.some((item) => item.slug === slug),
  );
  // Many archaeological/architectural works are deliberately anonymous or
  // collective; keep those visible as documented exceptions, not false errors.
  const anonymousWorks = new Set([
    'venus-de-willendorf',
    'cueva-de-lascaux',
    'estela-de-naram-sin',
    'busto-de-nefertiti',
    'tapiz-de-bayeux',
    'catedral-de-chartres',
    'piedra-del-sol',
    'templo-de-kukulcan',
    'lineas-de-nazca',
    'gran-mezquita-de-cordoba',
  ]);
  const missingCreators = entities
    .filter(
      (entity) =>
        entity.type === 'ARTWORK' &&
        !outgoing.get(entity.id)?.get('CREATED_BY') &&
        !anonymousWorks.has(entity.slug),
    )
    .map((entity) => entity.slug);
  const nonStudioFigures = new Set(['plinio-el-viejo', 'agustin-de-hipona']);
  const peopleWithoutWorks = entities
    .filter(
      (entity) =>
        entity.type === 'ARTIST' &&
        !incoming.get(entity.id)?.get('CREATED_BY') &&
        !nonStudioFigures.has(entity.slug),
    )
    .map((entity) => entity.slug);
  const movementsWithoutPeople = entities
    .filter(
      (entity) =>
        entity.type === 'MOVEMENT' && !incoming.get(entity.id)?.get('BELONGS_TO_MOVEMENT'),
    )
    .map((entity) => entity.slug);
  const organizationsWithoutEdges = entities
    .filter((entity) => entity.type === 'ORGANIZATION' && (degree.get(entity.id) ?? 0) < 2)
    .map((entity) => entity.slug);
  const localeCounts = new Map<string, number>();
  for (const translation of translations)
    localeCounts.set(translation.locale, (localeCounts.get(translation.locale) ?? 0) + 1);
  const topHubs = entities
    .map((entity) => ({
      slug: entity.slug,
      title: entity.title,
      degree: degree.get(entity.id) ?? 0,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 10);
  const placeById = new Map(
    entities.filter((entity) => entity.type === 'PLACE').map((entity) => [entity.id, entity.slug]),
  );
  const regions: Record<string, Set<string>> = {
    Europe: new Set([
      'florencia',
      'roma',
      'atenas',
      'venecia',
      'milan',
      'paris',
      'londres',
      'madrid',
      'amsterdam',
      'viena',
      'berlin',
      'munich',
      'moscu',
      'barcelona',
      'toledo',
      'dessau',
      'belgrado',
      'bucarest',
      'mantua',
    ]),
    'North America': new Set(['nueva-york', 'los-angeles']),
    'Latin America': new Set([
      'ciudad-de-mexico',
      'barcelona',
      'bogota',
      'buenos-aires',
      'sao-paulo',
    ]),
    Africa: new Set(['cairo', 'benin-city', 'djenne', 'jartum', 'johannesburgo', 'lagos']),
    'Middle East / Islamic world': new Set(['teheran', 'cairo', 'constantinopla']),
    'South Asia': new Set(['delhi']),
    'East Asia': new Set(['tokio', 'pekin', 'kyoto', 'seul']),
    'Mesoamerica / Andes': new Set(['teotihuacan', 'tenochtitlan', 'cuzco']),
  };
  const geography = Object.fromEntries(
    Object.entries(regions).map(([region, places]) => [
      region,
      entities.filter((entity) =>
        [...(adjacency.get(entity.id) ?? [])].some((id) => places.has(placeById.get(id) ?? '')),
      ).length,
    ]),
  );
  const disciplineConcepts: Record<string, Set<string>> = {
    Painting: new Set(['pintura-al-oleo', 'fresco', 'temple', 'acuarela']),
    Sculpture: new Set(['talla', 'fundicion', 'marmol', 'bronce']),
    Architecture: new Set(['arquitectura']),
    Photography: new Set(['fotografia', 'pelicula-fotografica']),
    Printmaking: new Set(['grabado', 'xilografia', 'aguafuerte', 'litografia', 'serigrafia']),
    Performance: new Set(['performance']),
    Installation: new Set(['instalacion']),
    Design: new Set(['diseño-grafico', 'tipografia']),
  };
  const disciplineProxy = Object.fromEntries(
    Object.entries(disciplineConcepts).map(([discipline, concepts]) => [
      discipline,
      entities.filter((entity) =>
        [...(adjacency.get(entity.id) ?? [])].some((id) =>
          concepts.has(entities.find((candidate) => candidate.id === id)?.slug ?? ''),
        ),
      ).length,
    ]),
  );
  const integrity = {
    brokenRelations: broken,
    duplicateRelations: duplicateEdges.size,
    missingFoundationalNodes: missing,
    duplicateNormalizedTitles: suspiciousDuplicates,
    relationTypes: Object.fromEntries([...relationCounts.entries()].sort()),
    missingCreators,
    peopleWithoutWorks,
    movementsWithoutPeople,
    organizationsWithoutEdges,
  };
  console.log(
    JSON.stringify(
      {
        entities: entities.length,
        relations: relations.length,
        byType: by(entities, (item) => item.type),
        byKind: by(entities, (item) => item.kind),
        connectivity: {
          averageDegree: entities.length
            ? Number(((relations.length * 2) / entities.length).toFixed(2))
            : 0,
          medianDegree: values.length ? values[Math.floor(values.length / 2)] : 0,
          atLeastThree: values.filter((value) => value >= 3).length,
          atLeastThreePercent: entities.length
            ? Number(
                ((values.filter((value) => value >= 3).length * 100) / entities.length).toFixed(1),
              )
            : 0,
          orphans: values.filter((value) => value === 0).length,
          components: components.length,
          largestComponentPercent: entities.length
            ? Number(((components[0] * 100) / entities.length).toFixed(1))
            : 0,
          topHubs,
        },
        integrity,
        coverage: {
          byType: by(entities, (item) => item.type),
          relationTypes: Object.fromEntries([...relationCounts.entries()].sort()),
          entityYearBands: {
            ancient: entities.filter((item) => (item.endYear ?? item.startYear ?? 9999) < 500)
              .length,
            medieval: entities.filter(
              (item) => (item.startYear ?? 9999) >= 500 && (item.startYear ?? 9999) < 1400,
            ).length,
            earlyModern: entities.filter(
              (item) => (item.startYear ?? 9999) >= 1400 && (item.startYear ?? 9999) < 1800,
            ).length,
            modern: entities.filter(
              (item) => (item.startYear ?? 9999) >= 1800 && (item.startYear ?? 9999) < 1950,
            ).length,
            contemporary: entities.filter((item) => (item.startYear ?? 9999) >= 1950).length,
          },
          geography,
          disciplineProxy,
        },
        translations: {
          locales: Object.fromEntries(localeCounts),
          entitiesWithBothEsEn: entities.filter((entity) => {
            const locales = new Set(
              translations
                .filter((translation) => translation.entityId === entity.id)
                .map((translation) => translation.locale),
            );
            return locales.has('es') && locales.has('en');
          }).length,
        },
        aliases: {
          total: aliases.length,
          entitiesWithAliases: new Set(aliases.map((alias) => alias.entityId)).size,
        },
        provenance: { sourceRefs },
        emptyProductState: {
          seededResearch: research,
          publishedResearch,
          seededArticles: articles,
          seededPublications: publishedResearch,
          seededCollections: collections,
          users,
        },
      },
      null,
      2,
    ),
  );
  if (
    broken ||
    duplicateEdges.size ||
    missing.length ||
    research ||
    articles ||
    collections ||
    publishedResearch
  )
    process.exitCode = 1;
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
