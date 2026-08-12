import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchJobStatus,
  ResearchJobType,
  ResearchProjectStatus,
  ResearchProposalReviewState,
  LibraryMaterialKind,
  SourceType,
  type KnowledgeEntityKind,
  type Prisma,
} from '@prisma/client';
import {
  EntityEditorialService,
  kindForLegacyEntityType,
} from '../entities/entity-editorial.service';
import { LibraryService } from '../library/library.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { AssociateResearchLibraryMaterialDto } from './dto/associate-research-library-material.dto';
import { CiteResearchItemDto } from './dto/cite-research-item.dto';
import { CreateResearchClaimDto, SetResearchClaimStatusDto } from './dto/create-research-claim.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchLibraryExcerptDto } from './dto/create-research-library-excerpt.dto';
import { CreateResearchEvidenceFromExcerptDto } from './dto/create-research-evidence-from-excerpt.dto';
import { UpdateResearchEvidenceDto } from './dto/update-research-evidence.dto';
import { UpdateResearchLibraryExcerptDto } from './dto/update-research-library-excerpt.dto';
import { CreateLibraryMaterialDto } from '../library/dto/create-library-material.dto';
import { CreateResearchPdfMaterialDto } from './dto/create-research-pdf-material.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectStatusDto } from './dto/update-research-project-status.dto';
import { ReviewResearchProposalDto } from './dto/review-research-proposal.dto';
import { UpdateResearchProposalDto } from './dto/update-research-proposal.dto';
import { CreateResearchEntityDto } from './dto/create-research-entity.dto';
import { CreateResearchRelationDto } from './dto/create-research-relation.dto';
import { SearchSourcesQuery } from '../sources/dto/search-sources.query';
import { SourcesService } from '../sources/sources.service';
import type {
  ResearchKnowledgeFocusType,
  ResearchKnowledgeQuery,
  ResearchKnowledgeScope,
} from './dto/research-knowledge.query';
import type { ListResearchProposalsQuery } from './dto/list-research-proposals.query';
import type { UploadedResearchPdf } from './research-pdf-upload.config';
import { CreateResearchOutlineSectionDto } from './dto/create-research-outline-section.dto';
import { AddResearchOutlineSectionExcerptDto } from './dto/add-research-outline-section-excerpt.dto';
import { CreateResearchQuestionDto } from './dto/create-research-question.dto';
import { UpdateResearchQuestionDto } from './dto/update-research-question.dto';
import { ReorderResearchOutlineSectionsDto } from './dto/reorder-research-outline-sections.dto';
import { ReorderResearchQuestionsDto } from './dto/reorder-research-questions.dto';
import { UpdateResearchOutlineSectionDto } from './dto/update-research-outline-section.dto';
import { ResearchOutlineService } from './research-outline.service';
import { AddResearchOutlineSectionMaterialDto } from './dto/add-research-outline-section-material.dto';
import type { UploadedImageFile } from '../media/entity-media.service';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
import { resolveEntityMedia, resolvedMediaUrl } from '../media/media.resolver';
import { presentSectionDossiers } from './research-section-dossier';
const researchSourceSelect = {
  id: true,
  type: true,
  title: true,
  author: true,
  publisher: true,
  year: true,
  url: true,
} satisfies Prisma.SourceSelect;

const researchEvidenceTraceInclude = {
  source: { select: researchSourceSelect },
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
              source: { select: researchSourceSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ResearchEvidenceInclude;

function presentKnowledgeEvidence<T extends object>(evidence: T, traceabilityLoaded = true) {
  return {
    ...evidence,
    excerptStatus: traceabilityLoaded
      ? (evidence as { libraryExcerpt?: unknown }).libraryExcerpt
        ? 'AVAILABLE'
        : 'UNAVAILABLE'
      : 'NOT_LOADED',
  };
}

const researchKnowledgeEntitySelect = {
  id: true,
  projectId: true,
  canonicalEntityId: true,
  kind: true,
  title: true,
  aliases: true,
  summary: true,
  confidence: true,
  mentionCount: true,
  reviewState: true,
  createdAt: true,
  updatedAt: true,
};

const researchKnowledgeClaimSelect = {
  id: true,
  projectId: true,
  kind: true,
  title: true,
  summary: true,
  subjectClaimId: true,
  objectClaimId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const researchKnowledgeEvidenceSelect = {
  id: true,
  projectId: true,
  sourceId: true,
  libraryExcerptId: true,
  sourceVersion: true,
  locator: true,
  quote: true,
  context: true,
  note: true,
  fingerprint: true,
  createdAt: true,
  updatedAt: true,
};

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

@Injectable()
export class ResearchService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly sources: SourcesService,
    private readonly library: LibraryService,
    private readonly outline: ResearchOutlineService,
    private readonly entityEditorial: EntityEditorialService,
  ) {}

  getStudioStatus() {
    return {
      status: 'ready',
      scope: 'editorial-research-studio',
    };
  }

  async listProposals(projectId: string, query: ListResearchProposalsQuery) {
    const where = {
      projectId,
      ...(query.reviewState ? { reviewState: query.reviewState } : {}),
    };
    const [project, total, items] = await Promise.all([
      this.prisma.researchProject.findUnique({ where: { id: projectId }, select: { id: true } }),
      this.prisma.researchFindingProposal.count({ where }),
      this.prisma.researchFindingProposal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          relationType: { select: { id: true, key: true, label: true } },
          convertedEntity: { select: { id: true } },
          convertedRelation: { select: { id: true } },
          evidence: { include: { evidence: { include: researchEvidenceTraceInclude } } },
        },
      }),
    ]);
    if (!project) throw new NotFoundException('Research project not found');

    return {
      items: items.map((proposal) => ({
        ...proposal,
        evidence: proposal.evidence.map((item) => ({
          ...item,
          evidence: presentKnowledgeEvidence(item.evidence),
        })),
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async getKnowledgeMapGeneration(projectId: string) {
    await this.requireProject(projectId);
    const contextFingerprint = await this.analysisContextFingerprint(projectId);
    const inputFingerprint = this.jobFingerprint({
      projectId,
      type: ResearchJobType.EXTRACT_FINDINGS,
      contextFingerprint,
    });
    const [job, preparedMaterials] = await Promise.all([
      this.prisma.researchJob.findFirst({
        where: { projectId, type: ResearchJobType.EXTRACT_FINDINGS },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { findingProposals: true } } },
      }),
      this.prisma.libraryMaterialVersion.count({
        where: {
          status: 'READY',
          content: { not: null },
          material: { research: { some: { projectId } } },
        },
      }),
    ]);
    return {
      job,
      stale: Boolean(job && job.inputFingerprint !== inputFingerprint),
      canGenerate: preparedMaterials > 0,
      preparedMaterials,
    };
  }

  createProject(ownerId: string, dto: CreateResearchProjectDto) {
    return this.prisma.researchProject.create({
      data: {
        title: dto.title.trim(),
        ownerId,
        objective: dto.objective.trim(),
        scope: dto.scope?.trim() || null,
      },
    });
  }

  async uploadProjectCover(projectId: string, file: UploadedImageFile | undefined) {
    if (!file?.mimetype.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten imágenes válidas');
    }

    await this.prisma.researchProject.update({
      where: { id: projectId },
      data: {
        coverImageUrl: buildPublicUploadUrl(`media/${file.filename}`, this.mediaPublicBaseUrl),
      },
    });
    return this.getProject(projectId);
  }

  async clearProjectCover(projectId: string) {
    await this.prisma.researchProject.update({
      where: { id: projectId },
      data: { coverImageUrl: null },
    });
    return this.getProject(projectId);
  }

  async createOutlineSection(projectId: string, dto: CreateResearchOutlineSectionDto) {
    await this.outline.create(projectId, dto);
    return this.getProject(projectId);
  }

  async updateOutlineSection(
    projectId: string,
    sectionId: string,
    dto: UpdateResearchOutlineSectionDto,
  ) {
    await this.outline.update(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async uploadOutlineSectionImage(
    projectId: string,
    sectionId: string,
    file: UploadedImageFile | undefined,
  ) {
    await this.outline.setImage(projectId, sectionId, file);
    return this.getProject(projectId);
  }

  async clearOutlineSectionImage(projectId: string, sectionId: string) {
    await this.outline.clearImage(projectId, sectionId);
    return this.getProject(projectId);
  }

  async deleteOutlineSection(projectId: string, sectionId: string) {
    await this.outline.delete(projectId, sectionId);
    return this.getProject(projectId);
  }

  async reorderOutlineSections(projectId: string, dto: ReorderResearchOutlineSectionsDto) {
    await this.outline.reorder(projectId, dto);
    return this.getProject(projectId);
  }

  async addOutlineSectionExcerpt(
    projectId: string,
    sectionId: string,
    dto: AddResearchOutlineSectionExcerptDto,
  ) {
    await this.outline.addExcerpt(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async removeOutlineSectionExcerpt(
    projectId: string,
    sectionId: string,
    libraryExcerptId: string,
  ) {
    await this.outline.removeExcerpt(projectId, sectionId, libraryExcerptId);
    return this.getProject(projectId);
  }

  async addOutlineSectionMaterial(
    projectId: string,
    sectionId: string,
    dto: AddResearchOutlineSectionMaterialDto,
  ) {
    await this.outline.addMaterial(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async removeOutlineSectionMaterial(
    projectId: string,
    sectionId: string,
    materialVersionId: string,
  ) {
    await this.outline.removeMaterial(projectId, sectionId, materialVersionId);
    return this.getProject(projectId);
  }

  async createQuestion(projectId: string, sectionId: string, dto: CreateResearchQuestionDto) {
    await this.outline.createQuestion(projectId, sectionId, dto);
    return this.getProject(projectId);
  }
  async updateQuestion(
    projectId: string,
    sectionId: string,
    questionId: string,
    dto: UpdateResearchQuestionDto,
  ) {
    await this.outline.updateQuestion(projectId, sectionId, questionId, dto);
    return this.getProject(projectId);
  }
  async deleteQuestion(projectId: string, sectionId: string, questionId: string) {
    await this.outline.deleteQuestion(projectId, sectionId, questionId);
    return this.getProject(projectId);
  }

  async reorderQuestions(projectId: string, sectionId: string, dto: ReorderResearchQuestionsDto) {
    await this.outline.reorderQuestions(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async listProjects(ownerId: string) {
    const projects = await this.prisma.researchProject.findMany({
      where: { ownerId },
      orderBy: [{ lastActiveAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: {
          select: {
            sources: true,
            evidence: true,
            claims: true,
            libraryMaterials: true,
          },
        },
      },
    });
    return projects.map(({ _count, ...project }) => ({
      ...project,
      _count: { ..._count, materials: _count.libraryMaterials },
    }));
  }

  async listPublishedProjects() {
    return this.prisma.researchProject.findMany({
      where: { status: ResearchProjectStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        objective: true,
        scope: true,
        coverImageUrl: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async publishProject(projectId: string) {
    await this.prisma.researchProject.update({
      where: { id: projectId },
      data: {
        status: ResearchProjectStatus.PUBLISHED,
        publishedAt: new Date(),
        archivedAt: null,
        archivedById: null,
      },
    });
    return this.getProject(projectId);
  }

  searchSources(query: SearchSourcesQuery) {
    return this.sources.search(query);
  }

  async archiveProject(projectId: string, actorId: string) {
    await this.prisma.researchProject.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED', archivedAt: new Date(), archivedById: actorId },
    });
    return this.getProject(projectId);
  }

  async updateProjectStatus(
    projectId: string,
    actorId: string,
    dto: UpdateResearchProjectStatusDto,
  ) {
    await this.prisma.researchProject.update({
      where: { id: projectId },
      data:
        dto.status === ResearchProjectStatus.ARCHIVED
          ? { status: dto.status, archivedAt: new Date(), archivedById: actorId }
          : { status: dto.status, archivedAt: null, archivedById: null },
    });
    return this.getProject(projectId);
  }

  async deleteProject(projectId: string) {
    await this.prisma.researchProject.delete({ where: { id: projectId } });
    return { deleted: true };
  }

  async getKnowledge(projectId: string, query: ResearchKnowledgeQuery = {}) {
    const scope = query.scope;
    if (!scope) return this.getCompleteKnowledge(projectId);
    if (scope === 'topology') return this.getTopologyKnowledge(projectId);

    if (!query.focusType || !query.focusId?.trim()) {
      throw new BadRequestException('Research Knowledge focusType and focusId are required');
    }

    const focus = { type: query.focusType, id: query.focusId.trim() };
    return scope === 'focus'
      ? this.getFocusedKnowledge(projectId, focus)
      : this.getTraceabilityKnowledge(projectId, focus);
  }

  private knowledgeRelationInclude(projectId: string) {
    return {
      fromEntity: { select: researchKnowledgeEntitySelect },
      toEntity: { select: researchKnowledgeEntitySelect },
      relationType: { select: { id: true, key: true, label: true } },
      claims: {
        where: { claim: { projectId } },
        include: { claim: { select: researchKnowledgeClaimSelect } },
      },
    };
  }

  private knowledgeResponse<T extends Record<string, unknown>>(
    projectId: string,
    scope: ResearchKnowledgeScope | 'complete',
    data: T,
  ) {
    return { projectId, scope, focus: null, ...data };
  }

  private async getTopologyKnowledge(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: { select: researchKnowledgeEntitySelect, orderBy: { id: 'asc' } },
        relations: {
          include: this.knowledgeRelationInclude(projectId),
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const researchEntityByCanonicalId = new Map(
      project.entities
        .filter((entity) => entity.canonicalEntityId)
        .map((entity) => [entity.canonicalEntityId!, entity]),
    );
    const canonicalEntityIds = [...researchEntityByCanonicalId.keys()];
    const canonicalRelations =
      canonicalEntityIds.length > 1
        ? await this.prisma.relation.findMany({
            where: { fromId: { in: canonicalEntityIds }, toId: { in: canonicalEntityIds } },
            select: {
              id: true,
              fromId: true,
              toId: true,
              relationTypeId: true,
              relationType: { select: { id: true, key: true, label: true } },
              justification: true,
              confidence: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];
    const researchRelationKeys = new Set(
      project.relations.map(
        (relation) =>
          `${relation.fromEntityId}:${relation.toEntityId}:${relation.relationTypeId ?? ''}`,
      ),
    );
    const projectedCanonicalRelations = canonicalRelations.flatMap((relation) => {
      const fromEntity = researchEntityByCanonicalId.get(relation.fromId);
      const toEntity = researchEntityByCanonicalId.get(relation.toId);
      if (!fromEntity || !toEntity) return [];
      const key = `${fromEntity.id}:${toEntity.id}:${relation.relationTypeId}`;
      if (researchRelationKeys.has(key)) return [];
      return [
        {
          id: `core:${relation.id}`,
          canonicalRelationId: relation.id,
          origin: 'KNOWLEDGE_CORE' as const,
          canonicalStatus: relation.status,
          projectId,
          fromEntityId: fromEntity.id,
          toEntityId: toEntity.id,
          fromEntity,
          toEntity,
          relationTypeId: relation.relationTypeId,
          relationType: relation.relationType,
          explanation: relation.justification,
          confidence: relation.confidence,
          reviewState:
            relation.status === 'PUBLISHED'
              ? ResearchProposalReviewState.REVIEWED
              : ResearchProposalReviewState.PENDING,
          claims: [],
          createdAt: relation.createdAt,
          updatedAt: relation.updatedAt,
        },
      ];
    });

    return this.knowledgeResponse(project.id, 'topology', {
      expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
      entities: sortById(project.entities),
      relations: sortById([
        ...project.relations.map((relation) => ({ ...relation, origin: 'RESEARCH' as const })),
        ...projectedCanonicalRelations,
      ]),
      claims: [],
      contradictions: [],
      supportingEvidence: [],
    });
  }

  private async getCompleteKnowledge(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          select: {
            ...researchKnowledgeEntitySelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
        relations: { include: this.knowledgeRelationInclude(projectId), orderBy: { id: 'asc' } },
        claims: {
          select: {
            ...researchKnowledgeClaimSelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const entities = project.entities.map((entity) => ({
      ...entity,
      evidence: entity.evidence.map((item) => ({
        ...item,
        evidence: presentKnowledgeEvidence(item.evidence),
      })),
    }));
    const claims = project.claims.map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((item) => ({
        ...item,
        evidence: presentKnowledgeEvidence(item.evidence),
      })),
    }));
    return this.knowledgeResponse(project.id, 'complete', {
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities,
      relations: project.relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence: sortById(
        claims
          .flatMap((claim) => claim.evidence.map((item) => item.evidence))
          .filter(
            (evidence, index, all) => all.findIndex((item) => item.id === evidence.id) === index,
          ),
      ),
    });
  }

  private async getFocusedKnowledge(
    projectId: string,
    focus: { type: ResearchKnowledgeFocusType; id: string },
  ) {
    const relationWhere =
      focus.type === 'entity'
        ? { OR: [{ fromEntityId: focus.id }, { toEntityId: focus.id }] }
        : focus.type === 'relation'
          ? { id: focus.id }
          : focus.type === 'claim'
            ? { claims: { some: { claimId: focus.id } } }
            : { claims: { some: { claim: { evidence: { some: { evidenceId: focus.id } } } } } };
    const claimWhere =
      focus.type === 'entity'
        ? { relations: { some: { relation: relationWhere } } }
        : focus.type === 'relation'
          ? { relations: { some: { relationId: focus.id } } }
          : focus.type === 'claim'
            ? { id: focus.id }
            : { evidence: { some: { evidenceId: focus.id } } };
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          where: focus.type === 'entity' ? { id: focus.id } : { id: { in: [] } },
          select: researchKnowledgeEntitySelect,
        },
        relations: {
          where: relationWhere,
          include: this.knowledgeRelationInclude(projectId),
          orderBy: { id: 'asc' },
        },
        claims: { where: claimWhere, select: researchKnowledgeClaimSelect, orderBy: { id: 'asc' } },
        evidence: {
          where: focus.type === 'evidence' ? { id: focus.id } : { id: { in: [] } },
          select: researchKnowledgeEvidenceSelect,
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');
    const focused =
      focus.type === 'entity'
        ? project.entities[0]
        : focus.type === 'relation'
          ? project.relations.find((item) => item.id === focus.id)
          : focus.type === 'claim'
            ? project.claims[0]
            : project.evidence[0];
    if (!focused) throw new NotFoundException('Research Knowledge focus not found');

    const relations = project.relations;
    const entities = sortById(
      [
        ...project.entities,
        ...relations.flatMap((relation) => [relation.fromEntity, relation.toEntity]),
      ].filter((entity, index, all) => all.findIndex((item) => item.id === entity.id) === index),
    );
    const claims = sortById(
      [
        ...project.claims,
        ...relations.flatMap((relation) => relation.claims.map((item) => item.claim)),
      ].filter((claim, index, all) => all.findIndex((item) => item.id === claim.id) === index),
    );
    return this.knowledgeResponse(project.id, 'focus', {
      focus,
      expansions: {
        claims: 'SUMMARY',
        evidence: focus.type === 'evidence' ? 'SUMMARY' : 'NOT_LOADED',
        traceability: 'NOT_LOADED',
      },
      entities,
      relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence: project.evidence.map((evidence) =>
        presentKnowledgeEvidence(evidence, false),
      ),
    });
  }

  private async getTraceabilityKnowledge(
    projectId: string,
    focus: { type: ResearchKnowledgeFocusType; id: string },
  ) {
    const relationWhere =
      focus.type === 'entity'
        ? { OR: [{ fromEntityId: focus.id }, { toEntityId: focus.id }] }
        : focus.type === 'relation'
          ? { id: focus.id }
          : focus.type === 'claim'
            ? { claims: { some: { claimId: focus.id } } }
            : { claims: { some: { claim: { evidence: { some: { evidenceId: focus.id } } } } } };
    const claimWhere =
      focus.type === 'entity'
        ? { relations: { some: { relation: relationWhere } } }
        : focus.type === 'relation'
          ? { relations: { some: { relationId: focus.id } } }
          : focus.type === 'claim'
            ? { id: focus.id }
            : { evidence: { some: { evidenceId: focus.id } } };
    const evidenceWhere =
      focus.type === 'evidence'
        ? { evidenceId: focus.id, evidence: { projectId } }
        : { evidence: { projectId } };
    const relationInclude = {
      fromEntity: { select: researchKnowledgeEntitySelect },
      toEntity: { select: researchKnowledgeEntitySelect },
      claims: {
        where: { claim: { projectId } },
        include: {
          claim: {
            select: {
              ...researchKnowledgeClaimSelect,
              evidence: {
                where: evidenceWhere,
                include: { evidence: { include: researchEvidenceTraceInclude } },
              },
            },
          },
        },
      },
    };
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        entities: {
          where: focus.type === 'entity' ? { id: focus.id } : { id: { in: [] } },
          select: {
            ...researchKnowledgeEntitySelect,
            evidence: {
              where: { evidence: { projectId } },
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
        },
        relations: { where: relationWhere, include: relationInclude, orderBy: { id: 'asc' } },
        claims: {
          where: claimWhere,
          select: {
            ...researchKnowledgeClaimSelect,
            evidence: {
              where: evidenceWhere,
              include: { evidence: { include: researchEvidenceTraceInclude } },
            },
          },
          orderBy: { id: 'asc' },
        },
        evidence: {
          where: focus.type === 'evidence' ? { id: focus.id } : { id: { in: [] } },
          include: researchEvidenceTraceInclude,
        },
      },
    });
    if (!project) throw new NotFoundException('Research project not found');
    const focused =
      focus.type === 'entity'
        ? project.entities[0]
        : focus.type === 'relation'
          ? project.relations.find((item) => item.id === focus.id)
          : focus.type === 'claim'
            ? project.claims[0]
            : project.evidence[0];
    if (!focused) throw new NotFoundException('Research Knowledge focus not found');

    const entities = sortById(
      [
        ...project.entities.map((entity) => ({
          ...entity,
          evidence: entity.evidence.map((item) => ({
            ...item,
            evidence: presentKnowledgeEvidence(item.evidence),
          })),
        })),
        ...project.relations.flatMap((relation) => [relation.fromEntity, relation.toEntity]),
      ].filter((entity, index, all) => all.findIndex((item) => item.id === entity.id) === index),
    );
    const claims = sortById(
      [
        ...project.claims,
        ...project.relations.flatMap((relation) => relation.claims.map((item) => item.claim)),
      ]
        .map((claim) => ({
          ...claim,
          evidence: claim.evidence.map((item) => ({
            ...item,
            evidence: presentKnowledgeEvidence(item.evidence),
          })),
        }))
        .filter((claim, index, all) => all.findIndex((item) => item.id === claim.id) === index),
    );
    const supportingEvidence = sortById(
      [
        ...project.evidence.map((evidence) => presentKnowledgeEvidence(evidence)),
        ...claims.flatMap((claim) => claim.evidence.map((item) => item.evidence)),
      ].filter(
        (evidence, index, all) => all.findIndex((item) => item.id === evidence.id) === index,
      ),
    );
    return this.knowledgeResponse(project.id, 'traceability', {
      focus,
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities,
      relations: project.relations,
      claims,
      contradictions: claims.filter(
        (claim) =>
          claim.kind === ResearchClaimKind.CONTRADICTION ||
          claim.status === ResearchClaimStatus.CONTRADICTED,
      ),
      supportingEvidence,
    });
  }

  async getProject(id: string) {
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
        evidence: { orderBy: { createdAt: 'desc' }, include: researchEvidenceTraceInclude },
        decisions: { orderBy: { createdAt: 'desc' } },
        jobs: { orderBy: { updatedAt: 'desc' } },
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
            evidence: { include: { evidence: { include: researchEvidenceTraceInclude } } },
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
            evidence: { include: { evidence: { include: researchEvidenceTraceInclude } } },
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
        evidence: presentKnowledgeEvidence(item.evidence),
      })),
    }));
    const relations = research.relations ?? [];
    const claims = (research.claims ?? []).map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((item) => ({
        ...item,
        evidence: presentKnowledgeEvidence(item.evidence),
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

  async addProjectSource(projectId: string, dto: AddResearchProjectSourceDto) {
    const [project, source] = await Promise.all([
      this.prisma.researchProject.findUnique({ where: { id: projectId }, select: { id: true } }),
      this.prisma.source.findUnique({ where: { id: dto.sourceId }, select: { id: true } }),
    ]);

    if (!project) throw new NotFoundException('Research project not found');
    if (!source) throw new NotFoundException('Source not found');

    const note = dto.note?.trim() || null;
    await this.prisma.researchProjectSource.upsert({
      where: { projectId_sourceId: { projectId, sourceId: dto.sourceId } },
      create: { projectId, sourceId: dto.sourceId, note },
      update: { note },
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async removeProjectSource(projectId: string, sourceId: string) {
    await this.requireProject(projectId);
    const { count } = await this.prisma.researchProjectSource.deleteMany({
      where: { projectId, sourceId },
    });
    if (!count) throw new NotFoundException('Research project source not found');
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async citeResearchItem(projectId: string, dto: CiteResearchItemDto) {
    const item = await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');
      let sourceId = dto.sourceId;
      let data: { materialId?: string; libraryExcerptId?: string; evidenceId?: string } = {};
      if (dto.kind === 'material') {
        const material = await tx.libraryMaterial.findFirst({
          where: { id: dto.itemId, research: { some: { projectId } } },
          select: {
            id: true,
            sourceId: true,
            kind: true,
            title: true,
            versions: { orderBy: { version: 'desc' }, take: 1, select: { url: true } },
          },
        });
        if (!material) throw new NotFoundException('Research material not found');
        sourceId = sourceId ?? material.sourceId ?? undefined;
        if (!sourceId) {
          sourceId = (
            await tx.source.create({
              data: {
                type:
                  material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
                title: material.title,
                url: material.versions[0]?.url ?? null,
              },
              select: { id: true },
            })
          ).id;
          await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
        }
        data = { materialId: material.id };
      } else if (dto.kind === 'excerpt') {
        const excerpt = await tx.libraryExcerpt.findFirst({
          where: {
            id: dto.itemId,
            materialVersion: { material: { research: { some: { projectId } } } },
          },
          select: {
            id: true,
            materialVersion: {
              select: {
                material: {
                  select: {
                    id: true,
                    sourceId: true,
                    kind: true,
                    title: true,
                    versions: { orderBy: { version: 'desc' }, take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        });
        if (!excerpt) throw new NotFoundException('Research excerpt not found');
        sourceId = sourceId ?? excerpt.materialVersion.material.sourceId ?? undefined;
        if (!sourceId) {
          const material = excerpt.materialVersion.material;
          sourceId = (
            await tx.source.create({
              data: {
                type:
                  material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
                title: material.title,
                url: material.versions[0]?.url ?? null,
              },
              select: { id: true },
            })
          ).id;
          await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
        }
        data = { libraryExcerptId: excerpt.id };
      } else {
        const evidence = await tx.researchEvidence.findFirst({
          where: { id: dto.itemId, projectId },
          select: { id: true, sourceId: true },
        });
        if (!evidence) throw new NotFoundException('Research evidence not found');
        sourceId = sourceId ?? evidence.sourceId;
        data = { evidenceId: evidence.id };
      }
      if (!sourceId) throw new BadRequestException('The cited item has no source');
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId, sourceId } },
        create: { projectId, sourceId },
        update: {},
      });
      return tx.researchProjectCitation.create({ data: { projectId, sourceId, ...data } });
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async citeLibraryMaterial(projectId: string, materialId: string) {
    await this.prisma.$transaction(async (tx) => {
      const material = await tx.libraryMaterial.findFirst({
        where: { id: materialId, research: { some: { projectId } } },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });
      if (!material) throw new NotFoundException('Library material not found in this research');
      const sourceId =
        material.sourceId ??
        (
          await tx.source.create({
            data: {
              type:
                material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
              title: material.title,
              url: material.versions[0]?.url ?? null,
            },
            select: { id: true },
          })
        ).id;
      if (!material.sourceId)
        await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId, sourceId } },
        create: { projectId, sourceId },
        update: {},
      });
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async associateLibraryMaterial(projectId: string, dto: AssociateResearchLibraryMaterialDto) {
    return this.prisma.$transaction(async (tx) => {
      const [project, material] = await Promise.all([
        tx.researchProject.findUnique({ where: { id: projectId }, select: { id: true } }),
        tx.libraryMaterial.findUnique({ where: { id: dto.materialId }, select: { id: true } }),
      ]);

      if (!project) throw new NotFoundException('Research project not found');
      if (!material) throw new NotFoundException('Library material not found');

      return tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: dto.materialId } },
        create: { projectId, materialId: dto.materialId },
        update: {},
      });
    });
  }

  async removeLibraryMaterial(projectId: string, materialId: string) {
    await this.requireProject(projectId);
    const { count } = await this.prisma.researchLibraryMaterial.deleteMany({
      where: { projectId, materialId },
    });
    if (!count) throw new NotFoundException('Research material not found');
    return this.getProject(projectId);
  }

  async prepareSourceJob(projectId: string, sourceId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId, sourceId } },
      select: { sourceId: true },
    });
    if (!projectSource) throw new NotFoundException('Research project source not found');

    const type = ResearchJobType.PREPARE_SOURCE;
    const inputFingerprint = this.jobFingerprint({ projectId, sourceId, type });

    await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, sourceId, type, inputFingerprint },
      update: {},
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async extractProposalsJob(projectId: string, sourceId?: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const sourceKey = sourceId?.trim() || null;
    if (sourceKey) {
      const projectSource = await this.prisma.researchProjectSource.findUnique({
        where: { projectId_sourceId: { projectId, sourceId: sourceKey } },
        select: { sourceId: true },
      });
      if (!projectSource) throw new NotFoundException('Research project source not found');
    }

    const type = ResearchJobType.EXTRACT_FINDINGS;
    const inputFingerprint = this.jobFingerprint({
      projectId,
      sourceId: sourceKey ?? undefined,
      contextFingerprint: sourceKey ? undefined : await this.analysisContextFingerprint(projectId),
      type,
    });

    await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, sourceId: sourceKey, type, inputFingerprint },
      update: {
        status: ResearchJobStatus.QUEUED,
        attempts: 0,
        progressCurrent: 0,
        progressTotal: 0,
        startedAt: null,
        finishedAt: null,
        lastError: null,
      },
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async reviewProposal(projectId: string, proposalId: string, dto: ReviewResearchProposalDto) {
    if (
      dto.reviewState !== ResearchProposalReviewState.REVIEWED &&
      dto.reviewState !== ResearchProposalReviewState.REJECTED
    ) {
      throw new BadRequestException('Unsupported proposal review state');
    }

    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      select: { id: true },
    });
    if (!proposal) throw new NotFoundException('Research proposal not found');

    await this.prisma.researchFindingProposal.update({
      where: { id: proposalId },
      data: { reviewState: dto.reviewState },
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async convertProposalToClaim(projectId: string, proposalId: string) {
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      select: {
        id: true,
        title: true,
        summary: true,
        claimKind: true,
        reviewState: true,
        convertedClaimId: true,
        evidence: { select: { evidenceId: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Research proposal not found');
    if (proposal.reviewState !== ResearchProposalReviewState.REVIEWED) {
      throw new BadRequestException('Research proposal must be reviewed before conversion');
    }
    if (proposal.convertedClaimId) return this.getProject(projectId);

    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.researchClaim.create({
        data: {
          projectId,
          title: proposal.title,
          summary: proposal.summary,
          kind: proposal.claimKind ?? ResearchClaimKind.ASSERTION,
          status: ResearchClaimStatus.DRAFT,
          evidence: { create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })) },
        },
        select: { id: true },
      });

      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: { convertedClaimId: claim.id },
      });

      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });

    return this.getProject(projectId);
  }

  async updateProposal(projectId: string, proposalId: string, dto: UpdateResearchProposalDto) {
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      select: { id: true, type: true },
    });
    if (!proposal) throw new NotFoundException('Research proposal not found');
    if (proposal.type !== 'ENTITY' && dto.entityKind !== undefined) {
      throw new BadRequestException('Only entity proposals can change kind');
    }
    if (proposal.type !== 'RELATION' && dto.relationTypeId !== undefined) {
      throw new BadRequestException('Only relation proposals can change relation type');
    }
    if (dto.relationTypeId) {
      const relationType = await this.prisma.relationType.findUnique({
        where: { id: dto.relationTypeId },
        select: { id: true },
      });
      if (!relationType) throw new NotFoundException('Relation type not found');
    }
    await this.prisma.researchFindingProposal.update({
      where: { id: proposal.id },
      data: {
        title: dto.title?.trim() || undefined,
        summary: dto.summary?.trim() || undefined,
        entityKind: dto.entityKind,
        claimKind: dto.claimKind,
        relationTypeId: dto.relationTypeId?.trim() || undefined,
        explanation: dto.explanation?.trim() || undefined,
      },
    });
    await this.touchProject(projectId);
    return this.listProposals(projectId, { page: 1, limit: 100 });
  }

  async acceptProposal(projectId: string, proposalId: string) {
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      include: { evidence: { select: { evidenceId: true } } },
    });
    if (!proposal) throw new NotFoundException('Research proposal not found');
    if (proposal.reviewState === ResearchProposalReviewState.REJECTED) {
      throw new BadRequestException('Rejected proposals cannot be accepted');
    }
    if (proposal.type === 'CLAIM') return this.acceptClaimProposal(projectId, proposal);
    if (proposal.type === 'ENTITY') return this.acceptEntityProposal(projectId, proposal);
    if (proposal.type === 'RELATION') return this.acceptRelationProposal(projectId, proposal);
    throw new BadRequestException('Unsupported research proposal type');
  }

  async mergeEntityProposal(projectId: string, proposalId: string, entityId: string) {
    const [proposal, entity] = await Promise.all([
      this.prisma.researchFindingProposal.findFirst({
        where: { id: proposalId, projectId, type: 'ENTITY' },
        select: {
          id: true,
          reviewState: true,
          convertedEntityId: true,
          evidence: { select: { evidenceId: true } },
        },
      }),
      this.prisma.researchEntity.findFirst({
        where: { id: entityId, projectId },
        select: { id: true },
      }),
    ]);
    if (!proposal) throw new NotFoundException('Research entity proposal not found');
    if (!entity) throw new NotFoundException('Research entity not found');
    if (proposal.reviewState === ResearchProposalReviewState.REJECTED) {
      throw new BadRequestException('Rejected proposals cannot be merged');
    }
    if (proposal.convertedEntityId) return this.getProject(projectId);

    await this.prisma.$transaction(async (tx) => {
      await tx.researchEntityEvidence.createMany({
        data: proposal.evidence.map((item) => ({ entityId, evidenceId: item.evidenceId })),
        skipDuplicates: true,
      });
      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: {
          reviewState: ResearchProposalReviewState.REVIEWED,
          convertedEntityId: entityId,
        },
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });
    return this.getProject(projectId);
  }

  private async acceptClaimProposal(
    projectId: string,
    proposal: {
      id: string;
      convertedClaimId: string | null;
      title: string;
      summary: string | null;
      claimKind: ResearchClaimKind | null;
      evidence: Array<{ evidenceId: string }>;
    },
  ) {
    if (proposal.convertedClaimId) return this.getProject(projectId);
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.researchClaim.create({
        data: {
          projectId,
          title: proposal.title,
          summary: proposal.summary,
          kind: proposal.claimKind ?? ResearchClaimKind.ASSERTION,
          status: ResearchClaimStatus.DRAFT,
          evidence: { create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })) },
        },
        select: { id: true },
      });
      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: { reviewState: ResearchProposalReviewState.REVIEWED, convertedClaimId: claim.id },
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });
    return this.getProject(projectId);
  }

  private async acceptEntityProposal(
    projectId: string,
    proposal: {
      id: string;
      convertedEntityId: string | null;
      title: string;
      summary: string | null;
      entityKind: import('@prisma/client').KnowledgeEntityKind | null;
      evidence: Array<{ evidenceId: string }>;
    },
  ) {
    const entityKind = proposal.entityKind;
    if (!entityKind) throw new BadRequestException('Entity proposal kind is required');
    if (proposal.convertedEntityId) return this.getProject(projectId);
    await this.prisma.$transaction(async (tx) => {
      const entity = await tx.researchEntity.create({
        data: {
          projectId,
          kind: entityKind,
          title: proposal.title,
          summary: proposal.summary,
          reviewState: ResearchProposalReviewState.REVIEWED,
          evidence: { create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })) },
        },
        select: { id: true },
      });
      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: { reviewState: ResearchProposalReviewState.REVIEWED, convertedEntityId: entity.id },
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });
    return this.getProject(projectId);
  }

  private async acceptRelationProposal(
    projectId: string,
    proposal: {
      id: string;
      jobId: string | null;
      convertedRelationId: string | null;
      relationFromKey: string | null;
      relationToKey: string | null;
      relationTypeId: string | null;
      explanation: string | null;
      title: string;
      evidence: Array<{ evidenceId: string }>;
    },
  ) {
    if (proposal.convertedRelationId) return this.getProject(projectId);
    if (!proposal.jobId || !proposal.relationFromKey || !proposal.relationToKey) {
      throw new BadRequestException('Relation proposal endpoints are unavailable');
    }
    const endpoints = await this.prisma.researchFindingProposal.findMany({
      where: {
        jobId: proposal.jobId,
        type: 'ENTITY',
        proposalKey: { in: [proposal.relationFromKey, proposal.relationToKey] },
      },
      select: { proposalKey: true, convertedEntityId: true },
    });
    const ids = new Map(endpoints.map((item) => [item.proposalKey, item.convertedEntityId]));
    const fromEntityId = ids.get(proposal.relationFromKey);
    const toEntityId = ids.get(proposal.relationToKey);
    if (!fromEntityId || !toEntityId) {
      throw new BadRequestException('Accept both entity proposals before accepting this relation');
    }
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.researchClaim.create({
        data: {
          projectId,
          title: proposal.title,
          summary: proposal.explanation,
          kind: ResearchClaimKind.CONNECTION_HYPOTHESIS,
          status: ResearchClaimStatus.DRAFT,
          evidence: { create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })) },
        },
        select: { id: true },
      });
      const relation = await tx.researchRelation.create({
        data: {
          projectId,
          fromEntityId,
          toEntityId,
          relationTypeId: proposal.relationTypeId,
          explanation: proposal.explanation,
          reviewState: ResearchProposalReviewState.REVIEWED,
          claims: { create: { claimId: claim.id } },
        },
        select: { id: true },
      });
      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: {
          reviewState: ResearchProposalReviewState.REVIEWED,
          convertedRelationId: relation.id,
        },
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });
    return this.getProject(projectId);
  }

  async reviewRelation(projectId: string, relationId: string, dto: ReviewResearchProposalDto) {
    if (
      dto.reviewState !== ResearchProposalReviewState.REVIEWED &&
      dto.reviewState !== ResearchProposalReviewState.REJECTED
    )
      throw new BadRequestException('Unsupported research review state');
    const relation = await this.prisma.researchRelation.findFirst({
      where: { id: relationId, projectId },
      select: { id: true },
    });
    if (!relation) throw new NotFoundException('Research relation not found');
    await this.prisma.researchRelation.update({
      where: { id: relationId },
      data: { reviewState: dto.reviewState },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async createRelation(projectId: string, dto: CreateResearchRelationDto) {
    if (dto.fromEntityId === dto.toEntityId)
      throw new BadRequestException('Research relation needs two different entities');
    const claimIds = [...new Set(dto.claimIds.map((id) => id.trim()).filter(Boolean))];
    if (!claimIds.length) throw new BadRequestException('Research relation claims are required');
    const [entities, claims, relationType] = await Promise.all([
      this.prisma.researchEntity.count({
        where: { projectId, id: { in: [dto.fromEntityId, dto.toEntityId] } },
      }),
      this.prisma.researchClaim.count({ where: { projectId, id: { in: claimIds } } }),
      dto.relationTypeId
        ? this.prisma.relationType.findUnique({
            where: { id: dto.relationTypeId },
            select: { id: true },
          })
        : null,
    ]);
    if (entities !== 2) throw new NotFoundException('Research entity not found');
    if (claims !== claimIds.length) throw new NotFoundException('Research claim not found');
    if (dto.relationTypeId && !relationType) throw new NotFoundException('Relation type not found');
    await this.prisma.researchRelation.create({
      data: {
        projectId,
        fromEntityId: dto.fromEntityId,
        toEntityId: dto.toEntityId,
        relationTypeId: dto.relationTypeId || null,
        explanation: dto.explanation?.trim() || null,
        claims: { create: claimIds.map((claimId) => ({ claimId })) },
      },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async reviewEntity(projectId: string, entityId: string, dto: ReviewResearchProposalDto) {
    if (
      dto.reviewState !== ResearchProposalReviewState.REVIEWED &&
      dto.reviewState !== ResearchProposalReviewState.REJECTED
    )
      throw new BadRequestException('Unsupported research review state');
    const entity = await this.prisma.researchEntity.findFirst({
      where: { id: entityId, projectId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Research entity not found');
    await this.prisma.researchEntity.update({
      where: { id: entityId },
      data: { reviewState: dto.reviewState },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async createEntity(projectId: string, dto: CreateResearchEntityDto) {
    await this.requireProject(projectId);
    if (!dto.kind && !dto.canonicalType) {
      throw new BadRequestException('Research entity kind or canonical type is required');
    }
    if (dto.canonicalType && dto.canonicalEntityId) {
      throw new BadRequestException('Choose a new canonical draft or an existing canonical entity');
    }
    const evidenceIds = [...new Set(dto.evidenceIds.map((id) => id.trim()).filter(Boolean))];
    const evidence = await this.prisma.researchEvidence.count({
      where: { projectId, id: { in: evidenceIds } },
    });
    if (evidence !== evidenceIds.length) throw new NotFoundException('Research evidence not found');
    if (dto.canonicalEntityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: dto.canonicalEntityId },
        select: { id: true },
      });
      if (!entity) throw new NotFoundException('Canonical entity not found');
    }
    const kind: KnowledgeEntityKind = dto.canonicalType
      ? kindForLegacyEntityType(dto.canonicalType)
      : dto.kind!;
    if (dto.canonicalType) {
      await this.prisma.$transaction(async (tx) => {
        const canonical = await this.entityEditorial.createDraftRecord(tx, {
          type: dto.canonicalType!,
          kind,
          title: dto.title,
          summary: dto.summary,
        });
        await tx.researchEntity.create({
          data: {
            projectId,
            kind,
            title: dto.title.trim(),
            summary: dto.summary?.trim() || null,
            canonicalEntityId: canonical.id,
            evidence: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
          },
        });
      });
      await this.touchProject(projectId);
      return this.getProject(projectId);
    }
    await this.prisma.researchEntity.create({
      data: {
        projectId,
        kind,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        canonicalEntityId: dto.canonicalEntityId?.trim() || null,
        evidence: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async promoteEntity(
    projectId: string,
    entityId: string,
    canonicalType: import('@prisma/client').EntityType,
  ) {
    await this.requireProject(projectId);
    const canonicalKind = kindForLegacyEntityType(canonicalType);
    await this.prisma.$transaction(async (tx) => {
      const entity = await tx.researchEntity.findFirst({
        where: { id: entityId, projectId },
        select: {
          id: true,
          kind: true,
          title: true,
          summary: true,
          canonicalEntityId: true,
        },
      });
      if (!entity) throw new NotFoundException('Research entity not found');
      if (entity.canonicalEntityId) return;
      if (entity.kind !== canonicalKind) {
        throw new BadRequestException('Canonical type does not match the Research entity kind');
      }
      const canonical = await this.entityEditorial.createDraftRecord(tx, {
        type: canonicalType,
        kind: canonicalKind,
        title: entity.title,
        summary: entity.summary ?? undefined,
      });
      await tx.researchEntity.update({
        where: { id: entity.id },
        data: { canonicalEntityId: canonical.id },
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });
    return this.getProject(projectId);
  }

  private async queueMaterialPreparation(projectId: string, materialId: string) {
    const version = await this.prisma.libraryMaterialVersion.findFirst({
      where: { materialId },
      orderBy: { version: 'desc' },
      select: { id: true, status: true },
    });
    if (!version || version.status !== 'PENDING_PREPARATION') return;
    const type = ResearchJobType.PREPARE_MATERIAL;
    const inputFingerprint = this.jobFingerprint({
      projectId,
      materialVersionId: version.id,
      type,
    });
    const job = await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, materialVersionId: version.id, type, inputFingerprint },
      update: {},
      select: { id: true },
    });
    await this.prisma.researchJob.updateMany({
      where: { id: job.id, status: { not: ResearchJobStatus.RUNNING } },
      data: {
        status: ResearchJobStatus.QUEUED,
        startedAt: null,
        finishedAt: null,
        lastError: null,
      },
    });
  }

  async prepareMaterial(projectId: string, materialId: string) {
    const material = await this.prisma.libraryMaterial.findFirst({
      where: { id: materialId, research: { some: { projectId } } },
      select: {
        id: true,
        versions: { orderBy: { version: 'desc' }, take: 1, select: { id: true } },
      },
    });
    const version = material?.versions[0];
    if (!version) throw new NotFoundException('Research material not found');
    await this.prisma.libraryMaterialVersion.update({
      where: { id: version.id },
      data: { status: 'PENDING_PREPARATION' },
    });
    await this.queueMaterialPreparation(projectId, material.id);
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async createMaterial(projectId: string, dto: CreateLibraryMaterialDto) {
    let materialId = '';
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');

      const material = await this.library.createInitialMaterial(tx, dto);
      materialId = material.id;
      await tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: material.id } },
        create: { projectId, materialId: material.id },
        update: {},
      });
    });
    await this.queueMaterialPreparation(projectId, materialId);

    return this.getProject(projectId);
  }

  async createPdfMaterial(
    projectId: string,
    file: UploadedResearchPdf | undefined,
    dto: CreateResearchPdfMaterialDto,
  ) {
    if (!file) throw new BadRequestException('Research PDF is required');
    let materialId = '';
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');

      const material = await this.library.createInitialPdf(tx, file, dto.title);
      materialId = material.id;
      await tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: material.id } },
        create: { projectId, materialId: material.id },
        update: {},
      });
    });
    await this.queueMaterialPreparation(projectId, materialId);

    return this.getProject(projectId);
  }

  async createClaim(projectId: string, dto: CreateResearchClaimDto) {
    await this.requireProject(projectId);
    const evidenceIds = [...new Set(dto.evidenceIds.map((id) => id.trim()).filter(Boolean))];
    if (!evidenceIds.length) throw new BadRequestException('Research claim evidence is required');

    const evidence = await this.prisma.researchEvidence.findMany({
      where: { projectId, id: { in: evidenceIds } },
      select: { id: true },
    });
    if (evidence.length !== evidenceIds.length) {
      throw new NotFoundException('Research evidence not found');
    }

    const isConnection = dto.kind === ResearchClaimKind.CONNECTION_HYPOTHESIS;
    const subjectClaimId = isConnection ? dto.subjectClaimId?.trim() : null;
    const objectClaimId = isConnection ? dto.objectClaimId?.trim() : null;
    if (isConnection && (!subjectClaimId || !objectClaimId || subjectClaimId === objectClaimId)) {
      throw new BadRequestException('A connection needs two different research claims');
    }

    if (isConnection) {
      const relatedClaims = await this.prisma.researchClaim.count({
        where: { projectId, id: { in: [subjectClaimId!, objectClaimId!] } },
      });
      if (relatedClaims !== 2) throw new NotFoundException('Related research claim not found');
    }

    await this.prisma.researchClaim.create({
      data: {
        projectId,
        kind: dto.kind,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        subjectClaimId,
        objectClaimId,
        status: ResearchClaimStatus.DRAFT,
        evidence: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      },
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async setClaimStatus(projectId: string, claimId: string, dto: SetResearchClaimStatusDto) {
    const claim = await this.prisma.researchClaim.findFirst({
      where: { id: claimId, projectId },
      select: { id: true },
    });
    if (!claim) throw new NotFoundException('Research claim not found');

    await this.prisma.researchClaim.update({
      where: { id: claimId },
      data: { status: dto.status },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async createEvidence(projectId: string, dto: CreateResearchEvidenceDto) {
    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId, sourceId: dto.sourceId } },
      select: { projectId: true },
    });
    if (!projectSource) throw new NotFoundException('Research project source not found');

    const libraryExcerptId = dto.libraryExcerptId?.trim();
    if (libraryExcerptId) {
      const excerpt = await this.prisma.libraryExcerpt.findFirst({
        where: {
          id: libraryExcerptId,
          materialVersion: { material: { research: { some: { projectId } } } },
        },
        select: { id: true },
      });
      if (!excerpt) throw new NotFoundException('Library excerpt not found');
    }

    const data = {
      sourceVersion: dto.sourceVersion.trim(),
      locator: dto.locator.trim(),
      quote: dto.quote?.trim() || null,
      context: dto.context?.trim() || null,
      note: dto.note?.trim() || null,
      ...(libraryExcerptId ? { libraryExcerptId } : {}),
    };
    const fingerprint = this.evidenceFingerprint({ sourceId: dto.sourceId, ...data });

    await this.prisma.researchEvidence.upsert({
      where: { projectId_sourceId_fingerprint: { projectId, sourceId: dto.sourceId, fingerprint } },
      create: { projectId, sourceId: dto.sourceId, fingerprint, ...data },
      update: data,
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async createLibraryExcerpt(projectId: string, dto: CreateResearchLibraryExcerptDto) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.libraryMaterialVersion.findFirst({
        where: {
          id: dto.materialVersionId,
          material: { research: { some: { projectId } } },
        },
        select: { id: true },
      });
      if (!version) throw new NotFoundException('Library material version not found');
      return this.library.createExcerpt(tx, version.id, dto.locator, dto.text);
    });
  }

  async createEvidenceFromExcerpt(
    projectId: string,
    excerptId: string,
    dto: CreateResearchEvidenceFromExcerptDto = {},
  ) {
    await this.prisma.$transaction(async (tx) => {
      const excerpt = await tx.libraryExcerpt.findFirst({
        where: {
          id: excerptId,
          materialVersion: { material: { research: { some: { projectId } } } },
        },
        include: { materialVersion: { include: { material: true } } },
      });
      if (!excerpt) throw new NotFoundException('Library excerpt not found');

      const material = excerpt.materialVersion.material;
      const sourceId =
        material.sourceId ??
        (
          await tx.source.create({
            data: {
              type:
                material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
              title: material.title,
              url: excerpt.materialVersion.url,
            },
            select: { id: true },
          })
        ).id;
      if (!material.sourceId)
        await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId, sourceId } },
        create: { projectId, sourceId },
        update: {},
      });

      const sourceVersion = `material-v${excerpt.materialVersion.version}`;
      const fingerprint = this.evidenceFingerprint({
        sourceId,
        sourceVersion,
        locator: excerpt.locator,
        quote: null,
        context: null,
        note: null,
        libraryExcerptId: excerpt.id,
      });
      await tx.researchEvidence.upsert({
        where: { projectId_sourceId_fingerprint: { projectId, sourceId, fingerprint } },
        create: {
          projectId,
          sourceId,
          libraryExcerptId: excerpt.id,
          sourceVersion,
          locator: excerpt.locator,
          quote: null,
          context: dto.context?.trim() || null,
          note: dto.note?.trim() || null,
          fingerprint,
        },
        update: {},
      });
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async deleteEvidence(projectId: string, evidenceId: string) {
    const { count } = await this.prisma.researchEvidence.deleteMany({
      where: { id: evidenceId, projectId },
    });
    if (!count) throw new NotFoundException('Research evidence not found');
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async updateEvidence(projectId: string, evidenceId: string, dto: UpdateResearchEvidenceDto) {
    const { count } = await this.prisma.researchEvidence.updateMany({
      where: { id: evidenceId, projectId },
      data: { context: dto.context?.trim() || null, note: dto.note?.trim() || null },
    });
    if (!count) throw new NotFoundException('Research evidence not found');
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async deleteLibraryExcerpt(projectId: string, excerptId: string) {
    const excerpt = await this.prisma.libraryExcerpt.findFirst({
      where: {
        id: excerptId,
        materialVersion: { material: { research: { some: { projectId } } } },
      },
      select: { id: true, _count: { select: { evidence: true, sectionReferences: true } } },
    });
    if (!excerpt) throw new NotFoundException('Library excerpt not found');
    if (excerpt._count.evidence || excerpt._count.sectionReferences) {
      throw new BadRequestException(
        'Remove the Evidence and Section references before deleting this excerpt',
      );
    }
    await this.prisma.libraryExcerpt.delete({ where: { id: excerpt.id } });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async updateLibraryExcerpt(
    projectId: string,
    excerptId: string,
    dto: UpdateResearchLibraryExcerptDto,
  ) {
    const excerpt = await this.prisma.libraryExcerpt.findFirst({
      where: {
        id: excerptId,
        materialVersion: { material: { research: { some: { projectId } } } },
      },
      select: { id: true },
    });
    if (!excerpt) throw new NotFoundException('Library excerpt not found');
    await this.prisma.libraryExcerpt.update({
      where: { id: excerpt.id },
      data: { locator: dto.locator.trim(), text: dto.text.trim() },
    });
    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
  }

  private touchProject(projectId: string) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: { lastActiveAt: new Date() },
    });
  }

  private jobFingerprint(input: {
    projectId: string;
    type: ResearchJobType;
    sourceId?: string;
    materialVersionId?: string;
    contextFingerprint?: string;
  }) {
    return createHash('sha256')
      .update(
        [
          input.projectId,
          input.sourceId ?? input.materialVersionId ?? input.contextFingerprint ?? '',
          input.type,
        ].join('\u001f'),
      )
      .digest('hex');
  }

  private async analysisContextFingerprint(projectId: string) {
    const [materials, sections] = await Promise.all([
      this.prisma.researchLibraryMaterial.findMany({
        where: { projectId },
        select: {
          material: {
            select: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { id: true, contentHash: true, status: true },
              },
            },
          },
        },
      }),
      this.prisma.researchOutlineSection.findMany({
        where: { projectId },
        select: {
          id: true,
          updatedAt: true,
          drafts: {
            where: { archivedAt: null },
            select: { updatedAt: true, currentRevisionId: true },
          },
        },
      }),
    ]);
    return createHash('sha256').update(JSON.stringify({ materials, sections })).digest('hex');
  }

  private evidenceFingerprint(input: {
    sourceId: string;
    sourceVersion: string;
    locator: string;
    quote: string | null;
    context: string | null;
    note: string | null;
    libraryExcerptId?: string;
  }) {
    return createHash('sha256')
      .update(
        [
          input.sourceId,
          input.sourceVersion,
          input.locator,
          input.quote,
          input.context,
          input.note,
          input.libraryExcerptId,
        ]
          .map((value) => value ?? '')
          .join('\u001f'),
      )
      .digest('hex');
  }
}
