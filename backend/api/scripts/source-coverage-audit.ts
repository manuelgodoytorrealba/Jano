import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { BENCHMARK_DATASET } from './editorial-quality-benchmark';

type Accessibility =
  | 'PUBLIC_WEB_SOURCE'
  | 'PUBLIC_DOCUMENT'
  | 'EXISTING_LIBRARY_MATERIAL'
  | 'BIBLIOGRAPHIC_ONLY'
  | 'STRUCTURED_REFERENCE'
  | 'BROKEN_OR_INVALID'
  | 'DUPLICATE_OR_NEAR_DUPLICATE'
  | 'NEEDS_MANUAL_REVIEW';
type Quality =
  | 'PRIMARY_AUTHORITATIVE'
  | 'SCHOLARLY_STRONG_SECONDARY'
  | 'GENERAL_REFERENCE'
  | 'WEAK_REFERENCE'
  | 'UNKNOWN';
type Processing = 'AUTOMATICALLY_PROCESSABLE' | 'SEMI_AUTOMATIC' | 'MANUAL' | 'NOT_PROCESSABLE';

const urlIsValid = (url: string | null) => Boolean(url && /^https?:\/\/[^\s]+$/i.test(url));
const processability = (source: {
  url: string | null;
  type: string;
  materialCount: number;
}): Processing => {
  if (source.materialCount > 0) return 'AUTOMATICALLY_PROCESSABLE';
  if (source.url && /\.pdf(?:[?#]|$)/i.test(source.url)) return 'SEMI_AUTOMATIC';
  if (source.url && urlIsValid(source.url)) return 'AUTOMATICALLY_PROCESSABLE';
  if (source.type === 'WEBSITE' && source.url && !urlIsValid(source.url)) return 'NOT_PROCESSABLE';
  return 'MANUAL';
};
const quality = (source: {
  url: string | null;
  publisher: string | null;
  type: string;
  title: string;
}): Quality => {
  const text = `${source.url ?? ''} ${source.publisher ?? ''} ${source.title}`.toLocaleLowerCase(
    'es',
  );
  if (
    /museo|museum|archivo|archive|biblioteca nacional|instituto|universidad|.gov\b|.edu\b/.test(
      text,
    )
  )
    return 'PRIMARY_AUTHORITATIVE';
  if (
    source.type === 'PAPER' ||
    /journal|press|prensa|university|university press|oxford|cambridge/.test(text)
  )
    return 'SCHOLARLY_STRONG_SECONDARY';
  if (source.type === 'CATALOG' || source.type === 'BOOK') return 'GENERAL_REFERENCE';
  if (source.type === 'WEBSITE' && source.url) return 'UNKNOWN';
  return 'UNKNOWN';
};
const accessibility = (source: {
  url: string | null;
  type: string;
  materialCount: number;
  linkedEntities: number;
  duplicate: boolean;
}): Accessibility => {
  if (source.duplicate) return 'DUPLICATE_OR_NEAR_DUPLICATE';
  if (source.materialCount > 0) return 'EXISTING_LIBRARY_MATERIAL';
  if (source.url && !urlIsValid(source.url)) return 'BROKEN_OR_INVALID';
  if (source.url && /\.pdf(?:[?#]|$)/i.test(source.url)) return 'PUBLIC_DOCUMENT';
  if (source.url) return 'PUBLIC_WEB_SOURCE';
  if (source.type === 'BOOK' || source.type === 'CATALOG' || source.type === 'PAPER')
    return 'BIBLIOGRAPHIC_ONLY';
  return 'STRUCTURED_REFERENCE';
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const [sources, entities, materials, citations, evidence] = await Promise.all([
    prisma.source.findMany({
      include: {
        refs: { select: { entityId: true } },
        citations: {
          select: {
            entityId: true,
            relationId: true,
            entityAttributeId: true,
            researchEvidenceId: true,
          },
        },
        libraryMaterials: { select: { id: true } },
      },
    }),
    prisma.entity.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        sourceRefs: { select: { sourceId: true } },
        citations: { select: { sourceId: true, quote: true } },
      },
    }),
    prisma.libraryMaterial.findMany({
      select: {
        id: true,
        sourceId: true,
        versions: { select: { content: true, excerpts: { select: { id: true } } } },
      },
    }),
    prisma.citation.findMany({
      select: {
        sourceId: true,
        quote: true,
        entityId: true,
        relationId: true,
        entityAttributeId: true,
        researchEvidenceId: true,
      },
    }),
    prisma.researchEvidence.findMany({
      select: {
        sourceId: true,
        quote: true,
        libraryExcerptId: true,
        entityEvidence: { select: { entity: { select: { canonicalEntityId: true } } } },
      },
    }),
  ]);
  const materialBySource = new Map<string, typeof materials>();
  for (const material of materials)
    if (material.sourceId)
      materialBySource.set(material.sourceId, [
        ...(materialBySource.get(material.sourceId) ?? []),
        material,
      ]);
  const sourceRefsByEntity = new Map(entities.map((entity) => [entity.id, entity.sourceRefs]));
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const titleKeys = new Map<string, number>();
  for (const source of sources)
    titleKeys.set(
      `${source.title.toLocaleLowerCase('es')}|${source.url ?? ''}`,
      (titleKeys.get(`${source.title.toLocaleLowerCase('es')}|${source.url ?? ''}`) ?? 0) + 1,
    );
  const inventory = sources.map((source) => {
    const linkedEntities = [
      ...new Set([
        ...source.refs.map((ref) => ref.entityId),
        ...(source.citations.map((citation) => citation.entityId).filter(Boolean) as string[]),
      ]),
    ];
    const sourceMaterials = materialBySource.get(source.id) ?? [];
    const sourceEvidence = evidence.filter((item) => item.sourceId === source.id);
    const sourceCitations = citations.filter((item) => item.sourceId === source.id);
    const duplicate =
      (titleKeys.get(`${source.title.toLocaleLowerCase('es')}|${source.url ?? ''}`) ?? 0) > 1;
    const base = {
      url: source.url,
      type: source.type,
      materialCount: sourceMaterials.length,
      linkedEntities: linkedEntities.length,
      duplicate,
    };
    return {
      id: source.id,
      title: source.title,
      author: source.author,
      publisher: source.publisher,
      year: source.year,
      url: source.url,
      sourceType: source.type,
      linkedEntities: linkedEntities.map((id) => entityById.get(id)?.title ?? id),
      sourceRefs: source.refs.length,
      existingMaterial: sourceMaterials.length,
      existingExcerpts: sourceMaterials.reduce(
        (sum, material) =>
          sum + material.versions.reduce((inner, version) => inner + version.excerpts.length, 0),
        0,
      ),
      existingCitations: sourceCitations.length,
      existingEvidence: sourceEvidence.length,
      accessibility: accessibility(base),
      quality: quality(source),
      processability: processability(base),
      evidenceQuotes:
        sourceEvidence.filter((item) => Boolean(item.quote)).length +
        sourceCitations.filter((item) => Boolean(item.quote)).length,
    };
  });
  const sourceById = new Map(inventory.map((source) => [source.id, source]));
  const entityCoverage = entities.map((entity) => {
    const sourceIds = [
      ...new Set([
        ...entity.sourceRefs.map((ref) => ref.sourceId),
        ...entity.citations.map((citation) => citation.sourceId),
      ]),
    ];
    const rows = sourceIds.map((id) => sourceById.get(id)).filter(Boolean) as typeof inventory;
    const entityEvidence = evidence.filter((item) =>
      item.entityEvidence.some((link) => link.entity.canonicalEntityId === entity.id),
    );
    const fragments =
      entityEvidence.filter((item) => Boolean(item.quote)).length +
      entity.citations.filter((citation) => Boolean(citation.quote)).length;
    return {
      entity: entity.slug,
      title: entity.title,
      type: entity.type,
      sourceCount: rows.length,
      sourceTypes: [...new Set(rows.map((row) => row.sourceType))],
      sourceQuality: [...new Set(rows.map((row) => row.quality))],
      hasProcessableSource: rows.some((row) =>
        ['AUTOMATICALLY_PROCESSABLE', 'SEMI_AUTOMATIC'].includes(row.processability),
      ),
      hasDocumentaryFragment: fragments > 0,
      hasEvidence: entityEvidence.length > 0,
      hasOnlyBibliography: rows.length > 0 && fragments === 0,
    };
  });
  const globalCoverage = {
    entities: entities.length,
    noSource: entityCoverage.filter((row) => row.sourceCount === 0).length,
    bibliographyOnly: entityCoverage.filter((row) => row.hasOnlyBibliography).length,
    processableSource: entityCoverage.filter((row) => row.hasProcessableSource).length,
    actualEvidence: entityCoverage.filter((row) => row.hasEvidence || row.hasDocumentaryFragment)
      .length,
  };
  const byType = Object.values(
    entityCoverage.reduce(
      (groups, row) => {
        (groups[row.type] ??= []).push(row);
        return groups;
      },
      {} as Record<string, typeof entityCoverage>,
    ),
  ).map((rows) => ({
    type: rows[0].type,
    entities: rows.length,
    noSource: rows.filter((row) => row.sourceCount === 0).length,
    bibliographyOnly: rows.filter((row) => row.hasOnlyBibliography).length,
    processableSource: rows.filter((row) => row.hasProcessableSource).length,
    actualEvidence: rows.filter((row) => row.hasEvidence || row.hasDocumentaryFragment).length,
  }));
  const highLeverage = inventory
    .map((source) => ({
      id: source.id,
      title: source.title,
      linkedEntityCount: source.linkedEntities.length,
      quality: source.quality,
      processability: source.processability,
      score:
        source.linkedEntities.length * 3 +
        (source.quality === 'PRIMARY_AUTHORITATIVE'
          ? 5
          : source.quality === 'SCHOLARLY_STRONG_SECONDARY'
            ? 3
            : 1) +
        (source.processability === 'AUTOMATICALLY_PROCESSABLE'
          ? 4
          : source.processability === 'SEMI_AUTOMATIC'
            ? 2
            : 0) -
        source.evidenceQuotes,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
  const benchmarkDepth: Record<string, string> = {
    ritual: 'BASIC_EXPLANATION',
    poder: 'BASIC_EXPLANATION',
    religion: 'BASIC_EXPLANATION',
    muerte: 'BASIC_EXPLANATION',
    'pablo-picasso': 'CONTEXTUAL_ESSAY',
    caravaggio: 'CONTEXTUAL_ESSAY',
    'frida-kahlo': 'EDITORIAL_ENTRY',
    'marina-abramovic': 'CONTEXTUAL_ESSAY',
    'cueva-de-lascaux': 'EDITORIAL_ENTRY',
    'venus-de-willendorf': 'BASIC_EXPLANATION',
    guernica: 'CONTEXTUAL_ESSAY',
    fuente: 'CONTEXTUAL_ESSAY',
    cubismo: 'EDITORIAL_ENTRY',
    'arte-rupestre': 'EDITORIAL_ENTRY',
    surrealismo: 'EDITORIAL_ENTRY',
    renacimiento: 'BASIC_EXPLANATION',
    'siglo-xx': 'EDITORIAL_ENTRY',
    paleolitico: 'BASIC_EXPLANATION',
    paris: 'EDITORIAL_ENTRY',
    madrid: 'EDITORIAL_ENTRY',
    cuzco: 'BASIC_EXPLANATION',
    'exposicion-armory-show': 'BASIC_EXPLANATION',
    'museo-del-prado': 'EDITORIAL_ENTRY',
    'como-mirar-la-guerra-en-el-arte': 'BASIC_EXPLANATION',
  };
  const benchmark24 = BENCHMARK_DATASET.map((item) => {
    const coverage = entityCoverage.find((row) => row.entity === item.slug);
    const sourceRows = coverage
      ? inventory.filter((source) => source.linkedEntities.includes(coverage.title))
      : [];
    return {
      entity: item.slug,
      currentDepth: benchmarkDepth[item.slug] ?? 'UNKNOWN',
      sources: sourceRows.length,
      sourceQuality: [...new Set(sourceRows.map((row) => row.quality))],
      processableSourceCount: sourceRows.filter((row) =>
        ['AUTOMATICALLY_PROCESSABLE', 'SEMI_AUTOMATIC'].includes(row.processability),
      ).length,
      documentaryFragmentCount: sourceRows.reduce(
        (sum, row) => sum + row.existingExcerpts + row.evidenceQuotes,
        0,
      ),
      mainGap: coverage?.hasDocumentaryFragment
        ? 'RETRIEVAL_ASSEMBLY'
        : 'SOURCE_REQUIRES_EXTRACTION',
      fastestPathToEnrich: coverage?.hasProcessableSource
        ? 'process existing URL/material into LibraryExcerpt and Evidence'
        : 'manual source review',
    };
  });
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: {
          sources: sources.length,
          materials: materials.length,
          excerpts: materials.reduce(
            (sum, material) =>
              sum +
              material.versions.reduce((inner, version) => inner + version.excerpts.length, 0),
            0,
          ),
          citations: citations.length,
          evidence: evidence.length,
        },
        accessibilityDistribution: Object.fromEntries(
          [...new Set(inventory.map((row) => row.accessibility))].map((key) => [
            key,
            inventory.filter((row) => row.accessibility === key).length,
          ]),
        ),
        qualityDistribution: Object.fromEntries(
          [...new Set(inventory.map((row) => row.quality))].map((key) => [
            key,
            inventory.filter((row) => row.quality === key).length,
          ]),
        ),
        processabilityDistribution: Object.fromEntries(
          [...new Set(inventory.map((row) => row.processability))].map((key) => [
            key,
            inventory.filter((row) => row.processability === key).length,
          ]),
        ),
        sources: inventory,
        globalCoverage,
        coverageByType: byType,
        entities: entityCoverage,
        benchmark24,
        highLeverageSources: highLeverage,
        note: 'Audit only. No URLs requested, downloaded or processed; no records written.',
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  await pool.end();
}
if (require.main === module) void main();
