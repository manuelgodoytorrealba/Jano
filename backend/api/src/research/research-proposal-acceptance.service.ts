import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchProposalReviewState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateRelationProposal } from './relation-proposal-validation';

@Injectable()
export class ResearchProposalAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  async accept(projectId: string, proposalId: string) {
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
    if (proposal.convertedEntityId) return;

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
    return;
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
    if (proposal.convertedClaimId) return;
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
    return;
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
    if (proposal.convertedEntityId) return;
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
    return;
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
    if (proposal.convertedRelationId) return;
    const mapping = await validateRelationProposal(this.prisma, projectId, proposal.id);
    if (mapping.classification !== 'VALID_RELATION') throw new BadRequestException(mapping);
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
    const fromEntityId = ids.get(mapping.fromKey);
    const toEntityId = ids.get(mapping.toKey);
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
    return;
  }
}
