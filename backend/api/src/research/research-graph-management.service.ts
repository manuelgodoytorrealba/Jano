import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type KnowledgeEntityKind, ResearchProposalReviewState } from '@prisma/client';
import { EntityEditorialService } from '../entities/entity-editorial.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchEntityDto } from './dto/create-research-entity.dto';
import { CreateResearchRelationDto } from './dto/create-research-relation.dto';
import { ReviewResearchProposalDto } from './dto/review-research-proposal.dto';

@Injectable()
export class ResearchGraphManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityEditorial: EntityEditorialService,
  ) {}

  async reviewRelation(projectId: string, relationId: string, dto: ReviewResearchProposalDto) {
    if (!Object.values(ResearchProposalReviewState).includes(dto.reviewState))
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
    return;
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
    return;
  }

  async reviewEntity(projectId: string, entityId: string, dto: ReviewResearchProposalDto) {
    if (!Object.values(ResearchProposalReviewState).includes(dto.reviewState))
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
    return;
  }

  async deleteEntity(projectId: string, entityId: string) {
    const entity = await this.prisma.researchEntity.findFirst({
      where: { id: entityId, projectId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Research entity not found');
    await this.prisma.researchEntity.delete({ where: { id: entity.id } });
    return;
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
    const typeDefinition = dto.canonicalType
      ? await this.prisma.entityTypeDefinition.findUnique({ where: { key: dto.canonicalType } })
      : null;
    if (dto.canonicalType && (!typeDefinition || typeDefinition.status !== 'ACTIVE')) {
      throw new BadRequestException('Canonical entity type is unavailable');
    }
    const kind: KnowledgeEntityKind = typeDefinition?.baseKind ?? dto.kind!;
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
      return;
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
    return;
  }

  async promoteEntity(projectId: string, entityId: string, canonicalType: string) {
    await this.requireProject(projectId);
    const typeDefinition = await this.prisma.entityTypeDefinition.findUnique({
      where: { key: canonicalType },
    });
    if (!typeDefinition || typeDefinition.status !== 'ACTIVE') {
      throw new BadRequestException('Canonical entity type is unavailable');
    }
    const canonicalKind = typeDefinition.baseKind;
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
    return;
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
  }
}
