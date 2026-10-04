import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchEvidenceDecisionAction,
  ResearchFindingProposalType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResearchEvidencePromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async promote(projectId: string, logicalReviewIds: string[]) {
    const decisions = await this.prisma.researchEvidenceDecision.findMany({
      where: { projectId, logicalReviewId: { in: logicalReviewIds } },
      include: { evidence: true },
      orderBy: { logicalReviewId: 'asc' },
    });
    const approved = decisions.filter(
      (row) => row.decision === ResearchEvidenceDecisionAction.APPROVE_CLAIM,
    );
    return this.prisma.$transaction(async (tx) => {
      const result: Array<{ logicalReviewId: string; proposalId: string; created: boolean }> = [];
      for (const row of approved) {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const reviewedItem = (payload.reviewedItem ?? {}) as Record<string, unknown>;
        const targetEntityValue = payload.targetEntityId ?? reviewedItem.targetEntityId;
        const propositionValue = payload.proposition ?? reviewedItem.extractedAtomicProposition;
        const exactSupportValue =
          payload.exactSupport ?? payload.exactPersistedSupport ?? row.evidence.quote;
        const targetEntityId = typeof targetEntityValue === 'string' ? targetEntityValue : '';
        const proposition = typeof propositionValue === 'string' ? propositionValue : '';
        const exactSupport = typeof exactSupportValue === 'string' ? exactSupportValue : '';
        if (
          !targetEntityId ||
          !proposition ||
          !exactSupport ||
          !row.evidence.quote?.includes(exactSupport)
        ) {
          throw new BadRequestException(
            `Approved Evidence lacks a complete proposal payload: ${row.logicalReviewId}`,
          );
        }
        const target = await tx.entity.findUnique({
          where: { id: targetEntityId },
          select: { id: true, title: true, type: true },
        });
        if (!target)
          throw new BadRequestException(
            `Approved Evidence target not found: ${row.logicalReviewId}`,
          );
        const proposalKey = `evidence-review:${row.logicalReviewId}`;
        const resultFingerprint = createHash('sha256')
          .update(
            JSON.stringify({ projectId, proposalKey, proposition, evidenceId: row.evidenceId }),
          )
          .digest('hex');
        const duplicate = await tx.researchFindingProposal.findFirst({
          where: { projectId, resultFingerprint },
          select: { id: true },
        });
        if (duplicate) {
          result.push({
            logicalReviewId: row.logicalReviewId,
            proposalId: duplicate.id,
            created: false,
          });
          continue;
        }
        const jobFingerprint = createHash('sha256')
          .update(`${projectId}:${proposalKey}:${resultFingerprint}`)
          .digest('hex');
        const job = await tx.researchJob.upsert({
          where: {
            projectId_type_inputFingerprint: {
              projectId,
              type: 'EXTRACT_FINDINGS',
              inputFingerprint: jobFingerprint,
            },
          },
          create: {
            projectId,
            type: 'EXTRACT_FINDINGS',
            inputFingerprint: jobFingerprint,
            status: 'SUCCEEDED',
            progressCurrent: 1,
            progressTotal: 1,
            finishedAt: new Date(),
          },
          update: {
            status: 'SUCCEEDED',
            progressCurrent: 1,
            progressTotal: 1,
            finishedAt: new Date(),
          },
          select: { id: true },
        });
        const execution = await tx.aIExecution.create({
          data: {
            jobId: job.id,
            projectId,
            task: 'research.evidence_review_promotion',
            provider: 'human-review',
            model: 'none',
            input: {
              logicalReviewId: row.logicalReviewId,
              evidenceId: row.evidenceId,
              reviewerId: row.reviewerId,
            },
            output: { proposition, exactSupport },
          },
          select: { id: true },
        });
        const created = await tx.researchFindingProposal.create({
          data: {
            projectId,
            jobId: job.id,
            aiExecutionId: execution.id,
            type: ResearchFindingProposalType.CLAIM,
            proposalKey,
            resultFingerprint,
            title: proposition,
            summary: proposition,
            kind: 'ASSERTION',
            claimKind: ResearchClaimKind.ASSERTION,
            explanation: JSON.stringify({
              source: 'HUMAN_EVIDENCE_REVIEW',
              logicalReviewId: row.logicalReviewId,
              evidenceId: row.evidenceId,
              reviewerId: row.reviewerId,
            }),
            subjectRole: 'PRIMARY_SUBJECT',
            targetStatus: 'CONFIRMED',
            targetConfidence: 1,
            supportSpan: exactSupport,
            targetReason: JSON.stringify({
              targetEntityId,
              targetTitle: target.title,
              targetType: target.type,
            }),
            evidence: { create: { evidenceId: row.evidenceId } },
          },
          select: { id: true },
        });
        result.push({
          logicalReviewId: row.logicalReviewId,
          proposalId: created.id,
          created: true,
        });
      }
      return result;
    });
  }
}
