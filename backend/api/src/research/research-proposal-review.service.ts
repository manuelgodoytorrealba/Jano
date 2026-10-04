import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchProposalReviewState,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewResearchProposalDto } from './dto/review-research-proposal.dto';
import { ResearchProposalActionDto } from './dto/research-proposal-action.dto';
import { UpdateResearchProposalDto } from './dto/update-research-proposal.dto';
import type { ListResearchProposalsQuery } from './dto/list-research-proposals.query';

const proposalSourceSelect = {
  id: true,
  type: true,
  title: true,
  author: true,
  publisher: true,
  year: true,
  url: true,
} satisfies Prisma.SourceSelect;

const proposalEvidenceTraceInclude = {
  source: { select: proposalSourceSelect },
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
              source: { select: proposalSourceSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ResearchEvidenceInclude;

@Injectable()
export class ResearchProposalReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string, query: ListResearchProposalsQuery) {
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
          evidence: { include: { evidence: { include: proposalEvidenceTraceInclude } } },
        },
      }),
    ]);
    if (!project) throw new NotFoundException('Research project not found');

    return {
      items: items.map((proposal) => ({
        ...proposal,
        evidence: proposal.evidence.map((item) => ({
          ...item,
          evidence: {
            ...item.evidence,
            excerptStatus: item.evidence.libraryExcerpt ? 'AVAILABLE' : 'UNAVAILABLE',
          },
        })),
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async review(projectId: string, proposalId: string, dto: ReviewResearchProposalDto) {
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
    await this.recordProposalDecision(
      proposalId,
      dto.reviewState === 'REVIEWED' ? 'APPROVE' : 'REJECT',
    );

    return;
  }

  async recordProposalReviewDecision(
    projectId: string,
    proposalId: string,
    reviewerId: string,
    logicalReviewId: string,
    evidenceDecisionId: string,
    approvedProposition: string,
  ) {
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      select: { id: true, role: true, accountStatus: true },
    });
    if (!reviewer || reviewer.role !== 'ADMIN' || reviewer.accountStatus !== 'ACTIVE')
      throw new BadRequestException('Active admin reviewer required');
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      select: { id: true, proposalKey: true, title: true, reviewState: true },
    });
    if (!proposal || proposal.proposalKey !== `evidence-review:${logicalReviewId}`)
      throw new NotFoundException('Research proposal lineage not found');
    const existing = await this.prisma.researchProposalDecision.findFirst({
      where: { proposalId, payload: { path: ['proposalReviewId'], equals: logicalReviewId } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return { created: false, decision: existing };
    const payload = {
      wave: '003',
      attempt: 'RETRY_01',
      proposalReviewId: logicalReviewId,
      evidenceDecisionId,
      approvedProposition,
      decision: 'APPROVE_CLAIM',
      reviewerId,
      canonicalApplyRequired: true,
    };
    await this.prisma.researchFindingProposal.update({
      where: { id: proposalId },
      data: { reviewState: ResearchProposalReviewState.REVIEWED },
    });
    const decision = await this.prisma.researchProposalDecision.create({
      data: {
        id: createHash('sha256')
          .update(`${projectId}:proposal-review:${logicalReviewId}`)
          .digest('hex')
          .slice(0, 24),
        proposalId,
        action: 'APPROVE_CLAIM',
        actorId: reviewerId,
        payload,
      },
    });
    return { created: true, decision };
  }

  async applyAction(projectId: string, proposalId: string, dto: ResearchProposalActionDto) {
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      include: { evidence: { select: { evidenceId: true } } },
    });
    if (!proposal) throw new NotFoundException('Research proposal not found');
    if (
      dto.action === 'APPROVE' ||
      dto.action === 'APPROVE_RELATION' ||
      dto.action === 'APPROVE_NEW_ENTITY'
    )
      return 'ACCEPT' as const;
    if (dto.action === 'RESOLVE_TO_EXISTING' || dto.action === 'REROUTE') {
      if (!dto.canonicalEntityId && !dto.targetTitle)
        throw new BadRequestException('Reroute requires a canonical target or target title');
      const targetTitle = dto.targetTitle?.trim() || null;
      const rerouted = await this.prisma.$transaction(async (tx) => {
        const created = await tx.researchFindingProposal.create({
          data: {
            projectId,
            jobId: proposal.jobId,
            aiExecutionId: proposal.aiExecutionId,
            type: proposal.type,
            proposalKey: `${proposal.proposalKey ?? proposal.id}:reroute`,
            resultFingerprint: `${proposal.resultFingerprint ?? proposal.id}:reroute:${dto.canonicalEntityId ?? targetTitle}`,
            title: targetTitle ?? proposal.title,
            summary: proposal.summary,
            kind: proposal.kind,
            claimKind: proposal.claimKind,
            entityKind: proposal.entityKind,
            relationFromKey: proposal.relationFromKey,
            relationToKey: proposal.relationToKey,
            relationTypeId: proposal.relationTypeId,
            explanation: proposal.explanation,
            targetStatus: dto.canonicalEntityId ? 'TARGET_CONFIRMED' : 'TARGET_LIKELY',
            targetConfidence: dto.canonicalEntityId ? 1 : 0.7,
            targetReason: 'Human reroute from an auditable proposal.',
            identityDisposition: dto.canonicalEntityId ? 'EXISTING_ENTITY' : 'POSSIBLE_ENTITY',
            reviewState: 'PENDING',
            evidence: {
              create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })),
            },
          },
          select: { id: true },
        });
        await tx.researchFindingProposal.update({
          where: { id: proposal.id },
          data: { reviewState: 'REVIEWED', targetStatus: 'TARGET_MISMATCH' },
        });
        return created;
      });
      await this.recordProposalDecision(proposalId, dto.action, {
        replacementProposalId: rerouted.id,
        canonicalEntityId: dto.canonicalEntityId,
      });
      return 'UPDATED' as const;
    }
    if (dto.action === 'SPLIT') {
      const titles = (dto.childTitles ?? []).map((title) => title.trim()).filter(Boolean);
      if (titles.length < 2)
        throw new BadRequestException('Split requires at least two child claims');
      await this.prisma.$transaction(async (tx) => {
        for (const [index, title] of titles.entries())
          await tx.researchFindingProposal.create({
            data: {
              projectId,
              jobId: proposal.jobId,
              aiExecutionId: proposal.aiExecutionId,
              type: 'CLAIM',
              proposalKey: `${proposal.proposalKey ?? proposal.id}:child-${index + 1}`,
              resultFingerprint: `${proposal.resultFingerprint ?? proposal.id}:child-${index + 1}`,
              title,
              summary: proposal.summary,
              claimKind: proposal.claimKind ?? 'ASSERTION',
              reviewState: 'PENDING',
              evidence: {
                create: proposal.evidence.map((item) => ({ evidenceId: item.evidenceId })),
              },
            },
          });
        await tx.researchFindingProposal.update({
          where: { id: proposal.id },
          data: { reviewState: 'REVIEWED' },
        });
      });
      await this.recordProposalDecision(proposalId, 'SPLIT', { childTitles: titles });
      return 'UPDATED' as const;
    }
    const state =
      dto.action === 'DEFER' || dto.action === 'REQUEST_MORE_CONTEXT' ? 'PENDING' : 'REJECTED';
    await this.prisma.researchFindingProposal.update({
      where: { id: proposalId },
      data: { reviewState: state },
    });
    await this.recordProposalDecision(proposalId, dto.action);
    return 'UPDATED' as const;
  }

  async convertToClaim(projectId: string, proposalId: string) {
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
        data: { convertedClaimId: claim.id },
      });

      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });

    return;
  }

  async update(projectId: string, proposalId: string, dto: UpdateResearchProposalDto) {
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
  }

  private async recordProposalDecision(proposalId: string, action: string, payload?: object) {
    if (!this.prisma.researchProposalDecision?.create) return;
    await this.prisma.researchProposalDecision.create({
      data: {
        id: createHash('sha256')
          .update(`${proposalId}:${action}:${Date.now()}`)
          .digest('hex')
          .slice(0, 24),
        proposalId,
        action,
        payload,
      },
    });
  }
}
