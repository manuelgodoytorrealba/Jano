import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AIProvider } from '../ai/ai.provider';
import { PrismaService } from '../prisma/prisma.service';

const EXTRACT_FINDINGS_TASK = 'research.extract_findings';
const EXTRACT_FINDINGS_SCHEMA_VERSION = '2';

type ExtractFindingsJob = {
  id: string;
  projectId: string;
  sourceId: string | null;
};

type FindingProposalOutput = {
  proposals: Array<{
    title: string;
    summary?: string | null;
    kind?: string | null;
    evidenceIds: string[];
  }>;
  entities?: Array<{
    localId: string;
    kind: 'PERSON' | 'WORK' | 'ABSTRACTION' | 'EVENT' | 'PLACE' | 'ORGANIZATION';
    title: string;
    summary?: string | null;
    confidence?: number | null;
    evidenceIds: string[];
  }>;
  relations?: Array<{
    fromLocalId: string;
    toLocalId: string;
    relationTypeId?: string | null;
    explanation?: string | null;
    confidence?: number | null;
    evidenceIds: string[];
  }>;
};

@Injectable()
export class ResearchAIService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AIProvider,
  ) {}

  async extractFindings(job: ExtractFindingsJob): Promise<void> {
    const metadata = this.provider.metadata();
    const startedAt = Date.now();
    const execution = await this.prisma.aIExecution.create({
      data: {
        jobId: job.id,
        projectId: job.projectId,
        task: EXTRACT_FINDINGS_TASK,
        provider: metadata.provider,
        model: metadata.model,
        providerVersion: metadata.version ?? null,
        input: { job },
      },
      select: { id: true },
    });

    try {
      const input = await this.buildExtractFindingsInput(job);
      await this.prisma.aIExecution.update({
        where: { id: execution.id },
        data: { input: input },
      });

      if (!this.provider.isAvailable()) {
        throw new Error('AI provider is not available');
      }

      const result = await this.provider.runStructured({
        task: EXTRACT_FINDINGS_TASK,
        schemaVersion: EXTRACT_FINDINGS_SCHEMA_VERSION,
        input,
      });
      const output = this.validateExtractFindingsOutput(
        result.output,
        input.evidence.map((e) => e.id),
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.aIExecution.update({
          where: { id: execution.id },
          data: {
            output: output,
            durationMs: result.durationMs ?? Date.now() - startedAt,
            costCents: result.costCents ?? null,
          },
        });

        const entityIds = new Map<string, string>();
        for (const entity of output.entities ?? []) {
          const created = await tx.researchEntity.create({
            data: {
              projectId: job.projectId,
              kind: entity.kind,
              title: entity.title,
              summary: entity.summary,
              confidence: entity.confidence,
            },
            select: { id: true },
          });
          await tx.researchEntityEvidence.createMany({
            data: entity.evidenceIds.map((evidenceId) => ({
              entityId: created.id,
              evidenceId,
            })),
          });
          entityIds.set(entity.localId, created.id);
        }
        for (const relation of output.relations ?? []) {
          const fromEntityId = entityIds.get(relation.fromLocalId);
          const toEntityId = entityIds.get(relation.toLocalId);
          if (!fromEntityId || !toEntityId)
            throw new Error('AI relation references unknown research entity');
          const claim = await tx.researchClaim.create({
            data: {
              projectId: job.projectId,
              kind: 'ASSERTION',
              title: relation.explanation?.trim() || 'Relación de investigación',
              summary: relation.explanation,
              evidence: { create: relation.evidenceIds.map((evidenceId) => ({ evidenceId })) },
            },
            select: { id: true },
          });
          await tx.researchRelation.create({
            data: {
              projectId: job.projectId,
              fromEntityId,
              toEntityId,
              relationTypeId: relation.relationTypeId,
              explanation: relation.explanation,
              confidence: relation.confidence,
              claims: { create: { claimId: claim.id } },
            },
          });
        }

        for (const proposal of output.proposals) {
          const created = await tx.researchFindingProposal.create({
            data: {
              projectId: job.projectId,
              aiExecutionId: execution.id,
              title: proposal.title.trim(),
              summary: proposal.summary?.trim() || null,
              kind: proposal.kind?.trim() || null,
            },
            select: { id: true },
          });

          await tx.researchFindingProposalEvidence.createMany({
            data: [...new Set(proposal.evidenceIds)].map((evidenceId) => ({
              proposalId: created.id,
              evidenceId,
            })),
          });
        }
      });
    } catch (error) {
      await this.prisma.aIExecution.update({
        where: { id: execution.id },
        data: {
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : 'AI execution failed',
        },
      });
      throw error;
    }
  }

  private async buildExtractFindingsInput(job: ExtractFindingsJob) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: job.projectId },
      select: { id: true, title: true, objective: true, scope: true },
    });
    if (!project) throw new Error('Research project not found');

    const evidence = await this.prisma.researchEvidence.findMany({
      where: { projectId: job.projectId, ...(job.sourceId ? { sourceId: job.sourceId } : {}) },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sourceId: true,
        sourceVersion: true,
        locator: true,
        quote: true,
        context: true,
        note: true,
      },
    });
    if (!evidence.length)
      throw new Error('Research evidence is required for AI finding extraction');

    return {
      project,
      sourceId: job.sourceId,
      evidence,
      canonicalEntityKinds: ['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'],
      outputContract:
        'Propose evidence-backed cultural referents and connections; never publish automatically.',
    };
  }

  private validateExtractFindingsOutput(
    output: unknown,
    evidenceIds: string[],
  ): FindingProposalOutput {
    const knownEvidenceIds = new Set(evidenceIds);
    if (
      !output ||
      typeof output !== 'object' ||
      !Array.isArray((output as FindingProposalOutput).proposals)
    ) {
      throw new Error('Invalid AI output for finding extraction');
    }

    const proposals = (output as FindingProposalOutput).proposals.map((proposal) => {
      const title = typeof proposal.title === 'string' ? proposal.title.trim() : '';
      if (!Array.isArray(proposal.evidenceIds)) throw new Error('Invalid AI finding proposal');

      const rawIds = [...new Set(proposal.evidenceIds)];
      if (rawIds.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))) {
        throw new Error('AI finding proposal references unknown evidence');
      }

      const ids = rawIds;
      if (!title || !ids.length) throw new Error('Invalid AI finding proposal');

      return {
        title,
        summary: typeof proposal.summary === 'string' ? proposal.summary : null,
        kind: typeof proposal.kind === 'string' ? proposal.kind : null,
        evidenceIds: ids,
      };
    });

    const entities = Array.isArray((output as FindingProposalOutput).entities)
      ? ((output as FindingProposalOutput).entities ?? []).map((entity) => {
          const localId = typeof entity.localId === 'string' ? entity.localId.trim() : '';
          const title = typeof entity.title === 'string' ? entity.title.trim() : '';
          const evidenceIds = Array.isArray(entity.evidenceIds)
            ? [...new Set(entity.evidenceIds)]
            : [];
          if (
            !localId ||
            !title ||
            !['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'].includes(
              entity.kind,
            ) ||
            !evidenceIds.length ||
            evidenceIds.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))
          )
            throw new Error('Invalid AI research entity');
          const confidence =
            typeof entity.confidence === 'number' &&
            entity.confidence >= 0 &&
            entity.confidence <= 1
              ? entity.confidence
              : null;
          return {
            localId,
            kind: entity.kind,
            title,
            summary: typeof entity.summary === 'string' ? entity.summary : null,
            confidence,
            evidenceIds,
          };
        })
      : [];
    const localIds = new Set(entities.map((entity) => entity.localId));
    const relations = Array.isArray((output as FindingProposalOutput).relations)
      ? ((output as FindingProposalOutput).relations ?? []).map((entity) => {
          const fromLocalId =
            typeof entity.fromLocalId === 'string' ? entity.fromLocalId.trim() : '';
          const toLocalId = typeof entity.toLocalId === 'string' ? entity.toLocalId.trim() : '';
          const evidenceIds = Array.isArray(entity.evidenceIds)
            ? [...new Set(entity.evidenceIds)]
            : [];
          if (
            !fromLocalId ||
            !toLocalId ||
            fromLocalId === toLocalId ||
            !localIds.has(fromLocalId) ||
            !localIds.has(toLocalId) ||
            !evidenceIds.length ||
            evidenceIds.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))
          )
            throw new Error('Invalid AI research relation');
          const confidence =
            typeof entity.confidence === 'number' &&
            entity.confidence >= 0 &&
            entity.confidence <= 1
              ? entity.confidence
              : null;
          return {
            fromLocalId,
            toLocalId,
            relationTypeId:
              typeof entity.relationTypeId === 'string' ? entity.relationTypeId : null,
            explanation: typeof entity.explanation === 'string' ? entity.explanation : null,
            confidence,
            evidenceIds,
          };
        })
      : [];
    return { proposals, entities, relations };
  }
}
