import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCoverage, researchPriority } from './knowledge-coverage';

@Injectable()
export class KnowledgeOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot() {
    const entities = await this.prisma.entity.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        kind: true,
        status: true,
        startYear: true,
        endYear: true,
        summary: true,
        content: true,
        contentLevel: true,
        _count: {
          select: {
            sourceRefs: true,
            citations: true,
            canonicalAssertions: true,
            attributes: true,
            outgoing: true,
            incoming: true,
            mediaLinks: true,
          },
        },
        canonicalAssertions: {
          where: { dimension: { in: ['HISTORICAL_CONTEXT', 'RECEPTION_OR_LEGACY'] } },
          select: { id: true },
        },
      },
    });
    const profiles = entities.map((entity) => {
      const relations = entity._count.outgoing + entity._count.incoming;
      const profile = computeCoverage({
        id: entity.id,
        title: entity.title,
        type: entity.type,
        kind: entity.kind,
        status: entity.status,
        startYear: entity.startYear,
        endYear: entity.endYear,
        summary: entity.summary,
        content: entity.content,
        contentLevel: entity.contentLevel,
        sources: entity._count.sourceRefs,
        citations: entity._count.citations,
        assertions: entity._count.canonicalAssertions,
        attributes: entity._count.attributes,
        relations,
        media: entity._count.mediaLinks,
        contextAssertions: entity.canonicalAssertions.length,
      });
      return { id: entity.id, title: entity.title, type: entity.type, relations, profile };
    });
    const [
      relations,
      sources,
      pendingEntityProposals,
      pendingRelationProposals,
      duplicateCandidates,
    ] = await Promise.all([
      this.prisma.relation.count(),
      this.prisma.source.count(),
      this.prisma.researchFindingProposal.count({
        where: { type: 'ENTITY', reviewState: 'PENDING' },
      }),
      this.prisma.researchFindingProposal.count({
        where: { type: 'RELATION', reviewState: 'PENDING' },
      }),
      this.prisma.researchFindingProposal.count({
        where: { identityDisposition: 'ALIAS_OR_DUPLICATE', reviewState: 'PENDING' },
      }),
    ]);
    const relationDistribution = profiles.map((item) => item.relations).sort((a, b) => a - b);
    const coverage = { MISSING: 0, WEAK: 0, ADEQUATE: 0, STRONG: 0 };
    for (const item of profiles) coverage[item.profile.overall] += 1;
    const queue = profiles
      .map((item) => ({
        entityId: item.id,
        entity: item.title,
        currentCoverage: item.profile.overall,
        mainGap: item.profile.needs[0] ?? null,
        priority: researchPriority(item.profile, item.relations),
        suggestedResearchAction: item.profile.needs[0] ?? null,
        needs: item.profile.needs,
      }))
      .filter((item) => item.priority > 0)
      .sort(
        (left, right) => right.priority - left.priority || left.entity.localeCompare(right.entity),
      );
    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalEntities: profiles.length,
        totalRelations: relations,
        totalSources: sources,
        medianRelationsPerEntity:
          relationDistribution[Math.floor(relationDistribution.length / 2)] ?? 0,
        orphanEntities: profiles.filter((item) => item.relations === 0).length,
        entitiesWithZeroSources: entities.filter((item) => item._count.sourceRefs === 0).length,
        entitiesWith1Source: entities.filter((item) => item._count.sourceRefs === 1).length,
        entitiesWith2PlusSources: entities.filter((item) => item._count.sourceRefs >= 2).length,
        entitiesWithCanonicalAssertions: entities.filter(
          (item) => item._count.canonicalAssertions > 0,
        ).length,
        entitiesWithEditorial: entities.filter((item) => item.summary && item.content).length,
        entitiesWithMedia: entities.filter((item) => item._count.mediaLinks > 0).length,
        pendingEntityProposals,
        pendingRelationProposals,
        duplicateCandidates,
        researchQueueSize: queue.length,
      },
      coverage,
      profiles,
      queue,
    };
  }
}
