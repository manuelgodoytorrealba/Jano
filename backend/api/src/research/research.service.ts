import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchDecisionAction,
  ResearchFindingStatus,
  ResearchJobType,
  ResearchProposalReviewState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { CreateResearchDecisionDto } from './dto/create-research-decision.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchFindingDto } from './dto/create-research-finding.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { ReviewResearchFindingProposalDto } from './dto/review-research-finding-proposal.dto';
import { SearchResearchSourcesQuery } from './dto/search-research-sources.query';

const FINDING_STATUS_BY_DECISION: Record<ResearchDecisionAction, ResearchFindingStatus> = {
  [ResearchDecisionAction.INCORPORATE]: ResearchFindingStatus.ACCEPTED,
  [ResearchDecisionAction.REJECT]: ResearchFindingStatus.REJECTED,
  [ResearchDecisionAction.POSTPONE]: ResearchFindingStatus.POSTPONED,
};

@Injectable()
export class ResearchService {
  constructor(private readonly prisma: PrismaService) {}

  getStudioStatus() {
    return {
      status: 'ready',
      scope: 'editorial-research-studio',
    };
  }

  createProject(dto: CreateResearchProjectDto) {
    return this.prisma.researchProject.create({
      data: {
        title: dto.title.trim(),
        objective: dto.objective.trim(),
        scope: dto.scope?.trim() || null,
      },
    });
  }

  listProjects() {
    return this.prisma.researchProject.findMany({
      orderBy: [{ lastActiveAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: {
          select: {
            sources: true,
            evidence: true,
            findings: true,
          },
        },
      },
    });
  }

  searchSources(query: SearchResearchSourcesQuery) {
    const q = query.q?.trim();
    const contains = q ? { contains: q, mode: 'insensitive' as const } : undefined;

    return this.prisma.source.findMany({
      where: contains
        ? {
            OR: [
              { title: contains },
              { author: contains },
              { publisher: contains },
              { url: contains },
              {
                translations: {
                  some: {
                    OR: [{ title: contains }, { author: contains }, { publisher: contains }],
                  },
                },
              },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 8,
      include: { translations: { orderBy: { locale: 'asc' } } },
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
        evidence: { orderBy: { createdAt: 'desc' } },
        findings: {
          include: { evidence: { include: { evidence: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        decisions: { orderBy: { createdAt: 'desc' } },
        jobs: { orderBy: { updatedAt: 'desc' } },
        findingProposals: {
          include: { evidence: { include: { evidence: true } } },
          orderBy: { createdAt: 'desc' },
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
      },
    });

    if (!project) throw new NotFoundException('Research project not found');
    return project;
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

  async extractFindingsJob(projectId: string, sourceId?: string) {
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
    const inputFingerprint = this.jobFingerprint({ projectId, sourceId: sourceKey ?? 'all', type });

    await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, sourceId: sourceKey, type, inputFingerprint },
      update: {},
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async reviewFindingProposal(
    projectId: string,
    proposalId: string,
    dto: ReviewResearchFindingProposalDto,
  ) {
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
    if (!proposal) throw new NotFoundException('Research finding proposal not found');

    await this.prisma.researchFindingProposal.update({
      where: { id: proposalId },
      data: { reviewState: dto.reviewState },
    });

    await this.touchProject(projectId);
    return this.getProject(projectId);
  }

  async convertFindingProposalToFinding(projectId: string, proposalId: string) {
    const proposal = await this.prisma.researchFindingProposal.findFirst({
      where: { id: proposalId, projectId },
      select: {
        id: true,
        title: true,
        summary: true,
        kind: true,
        reviewState: true,
        convertedFindingId: true,
        evidence: { select: { evidenceId: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Research finding proposal not found');
    if (proposal.reviewState !== ResearchProposalReviewState.REVIEWED) {
      throw new BadRequestException('Research finding proposal must be reviewed before conversion');
    }
    if (proposal.convertedFindingId) return this.getProject(projectId);

    await this.prisma.$transaction(async (tx) => {
      const finding = await tx.researchFinding.create({
        data: {
          projectId,
          title: proposal.title,
          summary: proposal.summary,
          kind: proposal.kind,
        },
        select: { id: true },
      });

      await tx.researchFindingEvidence.createMany({
        data: proposal.evidence.map((item) => ({
          findingId: finding.id,
          evidenceId: item.evidenceId,
        })),
      });

      await tx.researchFindingProposal.update({
        where: { id: proposal.id },
        data: { convertedFindingId: finding.id },
      });

      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });

    return this.getProject(projectId);
  }

  async createEvidence(projectId: string, dto: CreateResearchEvidenceDto) {
    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId, sourceId: dto.sourceId } },
      select: { projectId: true },
    });
    if (!projectSource) throw new NotFoundException('Research project source not found');

    const data = {
      sourceVersion: dto.sourceVersion.trim(),
      locator: dto.locator.trim(),
      quote: dto.quote.trim(),
      context: dto.context?.trim() || null,
      note: dto.note?.trim() || null,
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

  async createFinding(projectId: string, dto: CreateResearchFindingDto) {
    const evidenceIds = Array.isArray(dto.evidenceIds)
      ? [...new Set(dto.evidenceIds.map((id) => id.trim()).filter(Boolean))]
      : [];
    if (!evidenceIds.length) throw new BadRequestException('Finding evidence is required');

    const evidence = await this.prisma.researchEvidence.findMany({
      where: { projectId, id: { in: evidenceIds } },
      select: { id: true },
    });
    if (evidence.length !== evidenceIds.length) {
      throw new NotFoundException('Research evidence not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const finding = await tx.researchFinding.create({
        data: {
          projectId,
          title: dto.title.trim(),
          kind: dto.kind?.trim() || null,
          summary: dto.summary?.trim() || null,
        },
        select: { id: true },
      });

      await tx.researchFindingEvidence.createMany({
        data: evidenceIds.map((evidenceId) => ({ findingId: finding.id, evidenceId })),
      });

      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });

    return this.getProject(projectId);
  }

  async decideFinding(
    projectId: string,
    findingId: string,
    actorId: string,
    dto: CreateResearchDecisionDto,
  ) {
    const finding = await this.prisma.researchFinding.findFirst({
      where: { id: findingId, projectId },
      select: { id: true },
    });
    if (!finding) throw new NotFoundException('Research finding not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.researchFinding.update({
        where: { id: findingId },
        data: { status: FINDING_STATUS_BY_DECISION[dto.action] },
      });

      await tx.researchDecision.create({
        data: {
          projectId,
          findingId,
          actorId,
          action: dto.action,
          note: dto.note?.trim() || null,
        },
      });

      await tx.researchProject.update({
        where: { id: projectId },
        data: { lastActiveAt: new Date() },
      });
    });

    return this.getProject(projectId);
  }

  private touchProject(projectId: string) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: { lastActiveAt: new Date() },
    });
  }

  private jobFingerprint(input: { projectId: string; sourceId: string; type: ResearchJobType }) {
    return createHash('sha256')
      .update([input.projectId, input.sourceId, input.type].join('\u001f'))
      .digest('hex');
  }

  private evidenceFingerprint(input: {
    sourceId: string;
    sourceVersion: string;
    locator: string;
    quote: string;
    context: string | null;
    note: string | null;
  }) {
    return createHash('sha256')
      .update(
        [input.sourceId, input.sourceVersion, input.locator, input.quote, input.context, input.note]
          .map((value) => value ?? '')
          .join('\u001f'),
      )
      .digest('hex');
  }
}
