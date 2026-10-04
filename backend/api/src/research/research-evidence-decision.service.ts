import { isDeepStrictEqual } from 'node:util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { RecordEvidenceDecisionDto } from './dto/record-evidence-decision.dto';

@Injectable()
export class ResearchEvidenceDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  async record(projectId: string, reviewerId: string, dto: RecordEvidenceDecisionDto) {
    const errors = await validate(Object.assign(new RecordEvidenceDecisionDto(), dto));
    if (errors.length || !dto.logicalReviewId?.trim())
      throw new BadRequestException('Invalid Evidence decision');
    const project = await this.prisma.researchProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Research project not found');
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
    if (!reviewer || reviewer.role !== 'ADMIN' || reviewer.accountStatus !== 'ACTIVE') {
      throw new ForbiddenException('Active admin reviewer required');
    }
    const evidence = await this.prisma.researchEvidence.findFirst({
      where: { id: dto.evidenceId, projectId },
    });
    if (!evidence) throw new BadRequestException('Evidence does not belong to this project');
    const payload = dto.payload;
    const requiredText = (value: unknown): value is string =>
      typeof value === 'string' && !!value.trim();
    if (['APPROVE_CLAIM', 'ADDITIONAL_PROVENANCE'].includes(dto.decision)) {
      if (
        !requiredText(payload.targetEntityId) ||
        !requiredText(payload.proposition) ||
        !requiredText(payload.exactSupport)
      ) {
        throw new BadRequestException('Target, reviewed proposition and exact support required');
      }
      if (!evidence.quote?.includes(payload.exactSupport))
        throw new BadRequestException('Support is not in Evidence');
      if (!(await this.prisma.entity.findUnique({ where: { id: payload.targetEntityId } }))) {
        throw new BadRequestException('Canonical target not found');
      }
    }
    if (dto.decision === 'ADDITIONAL_PROVENANCE') {
      if (!requiredText(payload.canonicalAssertionId))
        throw new BadRequestException('Assertion ID required');
      const assertion = await this.prisma.canonicalAssertion.findUnique({
        where: { id: payload.canonicalAssertionId },
      });
      if (
        !assertion ||
        assertion.entityId !== payload.targetEntityId ||
        assertion.proposition !== payload.proposition
      ) {
        throw new BadRequestException('Existing assertion target/proposition mismatch');
      }
    }
    if (dto.decision === 'SEMANTIC_DUPLICATE') {
      if (
        !requiredText(payload.duplicateOfLogicalReviewId) ||
        payload.duplicateOfLogicalReviewId === dto.logicalReviewId
      ) {
        throw new BadRequestException('Distinct duplicate review reference required');
      }
      if (
        !(await this.prisma.researchEvidenceDecision.findUnique({
          where: {
            projectId_logicalReviewId: {
              projectId,
              logicalReviewId: payload.duplicateOfLogicalReviewId,
            },
          },
        }))
      ) {
        throw new BadRequestException('Duplicate decision not found in project');
      }
    }
    const where = {
      projectId_logicalReviewId: { projectId, logicalReviewId: dto.logicalReviewId },
    };
    const data = {
      projectId,
      reviewerId,
      evidenceId: dto.evidenceId,
      logicalReviewId: dto.logicalReviewId,
      decision: dto.decision,
      reason: dto.reason ?? null,
      payload: payload as Prisma.InputJsonObject,
    };
    const matches = (row: {
      evidenceId: string;
      reviewerId: string;
      decision: string;
      reason: string | null;
      payload: unknown;
    }) =>
      row.evidenceId === data.evidenceId &&
      row.reviewerId === reviewerId &&
      row.decision === data.decision &&
      row.reason === data.reason &&
      isDeepStrictEqual(row.payload, payload);
    const previous = await this.prisma.researchEvidenceDecision.findUnique({ where });
    if (previous) {
      if (!matches(previous))
        throw new ConflictException('Logical review ID already has a different decision');
      return { created: false, decision: previous };
    }
    try {
      return {
        created: true,
        decision: await this.prisma.researchEvidenceDecision.create({ data }),
      };
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const existing = await this.prisma.researchEvidenceDecision.findUnique({ where });
      if (!existing || !matches(existing))
        throw new ConflictException('Concurrent conflicting decision');
      return { created: false, decision: existing };
    }
  }

  async read(projectId: string, logicalReviewIds: string[] = []) {
    if (!(await this.prisma.researchProject.findUnique({ where: { id: projectId } })))
      throw new NotFoundException('Research project not found');
    const [evidenceDecisions, proposalDecisions] = await Promise.all([
      this.prisma.researchEvidenceDecision.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.researchProposalDecision.findMany({
        where: { proposal: { projectId } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const proposals = proposalDecisions.map((row) => {
      const payload = row.payload as Record<string, unknown> | null;
      return {
        ...row,
        logicalReviewId: typeof payload?.reviewId === 'string' ? payload.reviewId : row.proposalId,
        legacyReviewAnchor:
          payload?.decisionScope === 'DEFERRED_EVIDENCE_REVIEW' ? 'LEGACY_REVIEW_ANCHOR' : null,
      };
    });
    const ids = new Set([
      ...evidenceDecisions.map((decision) => decision.logicalReviewId),
      ...proposals.map((decision) => decision.logicalReviewId),
    ]);
    const population = new Set(logicalReviewIds);
    return {
      evidenceDecisions,
      proposalDecisions: proposals,
      totalLogicalReviewItems: logicalReviewIds.length ? population.size : null,
      evidenceDecisionCount: evidenceDecisions.length,
      proposalDecisionCount: proposals.length,
      totalDecided: logicalReviewIds.length
        ? [...population].filter((id) => ids.has(id)).length
        : ids.size,
      remainingUndecided: logicalReviewIds.length
        ? [...population].filter((id) => !ids.has(id)).length
        : null,
    };
  }
}
