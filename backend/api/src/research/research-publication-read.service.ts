import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchProjectStatus, ResearchProposalReviewState, type Prisma } from '@prisma/client';
import { resolveEntityMedia, resolvedMediaUrl } from '../media/media.resolver';
import { PrismaService } from '../prisma/prisma.service';

const publicResearchSourceSelect = {
  id: true,
  type: true,
  title: true,
  author: true,
  publisher: true,
  year: true,
  url: true,
} satisfies Prisma.SourceSelect;

@Injectable()
export class ResearchPublicationReadService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const project = await this.prisma.researchProject.findFirst({
      where: { id, status: ResearchProjectStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        objective: true,
        scope: true,
        coverImageUrl: true,
        publishedAt: true,
        outlineSections: {
          orderBy: [{ parentSectionId: 'asc' }, { sortOrder: 'asc' }],
          select: {
            id: true,
            title: true,
            objective: true,
            notes: true,
            imageUrl: true,
            sortOrder: true,
            drafts: {
              where: { archivedAt: null },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: { title: true, currentRevision: { select: { content: true } } },
            },
          },
        },
        // Public output can expose bibliography and reviewed entities, but never
        // private Research Knowledge evidence or editorial notes.
        sources: { select: { source: { select: publicResearchSourceSelect } } },
        entities: {
          where: { reviewState: ResearchProposalReviewState.REVIEWED },
          select: {
            id: true,
            title: true,
            kind: true,
            summary: true,
            canonicalEntity: {
              select: {
                id: true,
                slug: true,
                title: true,
                type: true,
                mediaLinks: {
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                  select: {
                    id: true,
                    role: true,
                    sortOrder: true,
                    isPrimary: true,
                    media: {
                      select: {
                        id: true,
                        url: true,
                        displayUrl: true,
                        mimeType: true,
                        isVector: true,
                        alt: true,
                        width: true,
                        height: true,
                        provider: true,
                        qualityTier: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        relations: {
          where: { reviewState: ResearchProposalReviewState.REVIEWED },
          select: {
            id: true,
            relationType: { select: { id: true, label: true, key: true, directed: true } },
            explanation: true,
            fromEntity: { select: { id: true, title: true, kind: true } },
            toEntity: { select: { id: true, title: true, kind: true } },
          },
        },
        relatedProjects: {
          where: { relatedProject: { status: ResearchProjectStatus.PUBLISHED } },
          orderBy: { createdAt: 'desc' },
          select: {
            relatedProject: {
              select: { id: true, title: true, objective: true, coverImageUrl: true },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Published research not found');

    const entities = project.entities.map((entity) => ({
      ...entity,
      canonicalEntity: entity.canonicalEntity
        ? {
            id: entity.canonicalEntity.id,
            slug: entity.canonicalEntity.slug,
            title: entity.canonicalEntity.title,
            type: entity.canonicalEntity.type,
            imageUrl: resolvedMediaUrl(resolveEntityMedia(entity.canonicalEntity, 'card')),
          }
        : null,
    }));
    const publicEntityIds = entities.flatMap((item) =>
      item.canonicalEntity ? [item.canonicalEntity.id] : [],
    );
    const researchEntityByCanonicalId = new Map(
      entities
        .filter((entity) => entity.canonicalEntity)
        .map((entity) => [entity.canonicalEntity!.id, entity]),
    );
    const canonicalRelations = publicEntityIds.length
      ? await this.prisma.relation.findMany({
          where: {
            status: 'PUBLISHED',
            fromId: { in: publicEntityIds },
            toId: { in: publicEntityIds },
          },
          select: {
            id: true,
            relationType: { select: { id: true, label: true, key: true, directed: true } },
            justification: true,
            fromId: true,
            toId: true,
          },
        })
      : [];
    const publishedRelations = [...project.relations];
    const relationKeys = new Set(
      project.relations.map(
        (relation) =>
          `${relation.fromEntity.id}:${relation.toEntity.id}:${relation.relationType?.label ?? ''}`,
      ),
    );
    for (const relation of canonicalRelations) {
      const fromEntity = researchEntityByCanonicalId.get(relation.fromId);
      const toEntity = researchEntityByCanonicalId.get(relation.toId);
      if (!fromEntity || !toEntity) continue;
      const key = `${fromEntity.id}:${toEntity.id}:${relation.relationType.label}`;
      if (relationKeys.has(key)) continue;
      relationKeys.add(key);
      publishedRelations.push({
        id: `core:${relation.id}`,
        relationType: relation.relationType,
        explanation: relation.justification,
        fromEntity: { id: fromEntity.id, title: fromEntity.title, kind: fromEntity.kind },
        toEntity: { id: toEntity.id, title: toEntity.title, kind: toEntity.kind },
      });
    }
    return {
      ...project,
      entities,
      relations: publishedRelations,
      related: project.relatedProjects.map(({ relatedProject }) => relatedProject),
    };
  }
}
