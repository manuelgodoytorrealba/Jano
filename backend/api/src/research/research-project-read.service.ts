import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchClaimKind, ResearchClaimStatus, type Prisma } from '@prisma/client';
import { resolveEntityMedia, resolvedMediaUrl } from '../media/media.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { presentSectionDossiers } from './research-section-dossier';

const privateResearchSourceSelect = {
  id: true,
  type: true,
  title: true,
  author: true,
  publisher: true,
  year: true,
  url: true,
} satisfies Prisma.SourceSelect;

const privateResearchEvidenceTraceInclude = {
  source: { select: privateResearchSourceSelect },
  libraryExcerpt: {
    select: {
      id: true,
      locator: true,
      text: true,
      materialVersion: {
        select: {
          id: true,
          version: true,
          material: {
            select: {
              id: true,
              title: true,
              source: { select: privateResearchSourceSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ResearchEvidenceInclude;

function presentPrivateEvidence<T extends object>(evidence: T) {
  return {
    ...evidence,
    excerptStatus: (evidence as { libraryExcerpt?: unknown }).libraryExcerpt
      ? 'AVAILABLE'
      : 'UNAVAILABLE',
  };
}

@Injectable()
export class ResearchProjectReadService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id },
      include: {
        sources: {
          include: { source: { include: { translations: { orderBy: { locale: 'asc' } } } } },
          orderBy: { createdAt: 'desc' },
        },
        citations: {
          orderBy: { createdAt: 'desc' },
          include: {
            material: { select: { title: true } },
            libraryExcerpt: { select: { locator: true, text: true } },
            evidence: { select: { locator: true, quote: true, context: true } },
          },
        },
        evidence: { orderBy: { createdAt: 'desc' }, include: privateResearchEvidenceTraceInclude },
        decisions: { orderBy: { createdAt: 'desc' } },
        jobs: { orderBy: { updatedAt: 'desc' } },
        relatedProjects: {
          orderBy: { createdAt: 'desc' },
          include: {
            relatedProject: {
              select: { id: true, title: true, objective: true, coverImageUrl: true, status: true },
            },
          },
        },
        libraryMaterials: {
          include: {
            material: {
              include: {
                versions: {
                  orderBy: { version: 'desc' },
                  take: 1,
                  include: { excerpts: { orderBy: { createdAt: 'asc' } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        entities: {
          include: {
            evidence: { include: { evidence: { include: privateResearchEvidenceTraceInclude } } },
            canonicalEntity: {
              select: {
                id: true,
                title: true,
                type: true,
                kind: true,
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
          orderBy: { updatedAt: 'desc' },
        },
        relations: {
          include: {
            claims: {
              include: { claim: { select: { id: true, title: true, kind: true, status: true } } },
            },
            fromEntity: { select: { id: true, title: true, kind: true } },
            toEntity: { select: { id: true, title: true, kind: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
        claims: {
          include: {
            evidence: { include: { evidence: { include: privateResearchEvidenceTraceInclude } } },
            subject: { select: { id: true, title: true, kind: true } },
            object: { select: { id: true, title: true, kind: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
        aiExecutions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            task: true,
            provider: true,
            model: true,
            providerVersion: true,
            durationMs: true,
            costCents: true,
            error: true,
            createdAt: true,
            jobId: true,
          },
        },
        outlineSections: {
          include: {
            questions: { orderBy: { sortOrder: 'asc' } },
            drafts: {
              where: { archivedAt: null },
              include: { currentRevision: true },
              orderBy: { updatedAt: 'desc' },
            },
            excerptReferences: {
              include: {
                libraryExcerpt: {
                  include: {
                    materialVersion: { include: { material: { include: { source: true } } } },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
            materialReferences: {
              include: {
                materialVersion: {
                  include: {
                    material: { include: { source: true } },
                    excerpts: { orderBy: { createdAt: 'asc' } },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: [{ parentSectionId: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!project) throw new NotFoundException('Research project not found');
    const { libraryMaterials, ...research } = project;
    const entities = (research.entities ?? []).map((entity) => ({
      ...entity,
      ...(entity.canonicalEntity
        ? {
            canonicalEntity: {
              id: entity.canonicalEntity.id,
              title: entity.canonicalEntity.title,
              type: entity.canonicalEntity.type,
              kind: entity.canonicalEntity.kind,
              imageUrl: resolvedMediaUrl(resolveEntityMedia(entity.canonicalEntity, 'card')),
            },
          }
        : {}),
      evidence: (entity.evidence ?? []).map((item) => ({
        ...item,
        evidence: presentPrivateEvidence(item.evidence),
      })),
    }));
    const relations = research.relations ?? [];
    const claims = (research.claims ?? []).map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((item) => ({
        ...item,
        evidence: presentPrivateEvidence(item.evidence),
      })),
    }));
    const knowledge = {
      projectId: project.id,
      scope: 'complete' as const,
      focus: null,
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities: [...entities].sort((left, right) => left.id.localeCompare(right.id)),
      relations: [...relations].sort((left, right) => left.id.localeCompare(right.id)),
      claims: [...claims].sort((left, right) => left.id.localeCompare(right.id)),
      contradictions: claims
        .filter(
          (claim) =>
            claim.kind === ResearchClaimKind.CONTRADICTION ||
            claim.status === ResearchClaimStatus.CONTRADICTED,
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
      supportingEvidence: claims
        .flatMap((claim) => claim.evidence.map((item) => item.evidence))
        .filter(
          (evidence, index, all) => all.findIndex((item) => item.id === evidence.id) === index,
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
    };
    return {
      ...research,
      outlineSections: presentSectionDossiers(
        research.outlineSections,
        research.evidence,
        claims,
        entities,
        relations,
      ),
      knowledge,
      materials: (libraryMaterials ?? [])
        .map(({ material }) => {
          const version = material.versions[0];
          return {
            id: material.id,
            projectId: project.id,
            materialVersionId: version.id,
            sourceId: material.sourceId,
            kind: material.kind,
            status: version.status,
            title: material.title,
            content: version.content,
            url: version.url,
            originalName: version.originalName,
            mimeType: version.mimeType,
            sizeBytes: version.sizeBytes,
            excerpts: version.excerpts,
            createdAt: material.createdAt,
            updatedAt: material.updatedAt,
          };
        })
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() || left.id.localeCompare(right.id),
        ),
    };
  }
}
