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
  entityCandidates?: Array<{
    localId: string;
    kind: 'PERSON' | 'WORK' | 'ABSTRACTION' | 'EVENT' | 'PLACE' | 'ORGANIZATION';
    title: string;
    summary?: string | null;
    confidence?: number | null;
    evidenceIds: string[];
  }>;
  relationCandidates?: Array<{
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

        const candidateIds = new Map<string, string>();
        for (const entityCandidate of output.entityCandidates ?? []) {
          const created = await tx.researchEntityCandidate.create({
            data: {
              projectId: job.projectId,
              kind: entityCandidate.kind,
              title: entityCandidate.title,
              summary: entityCandidate.summary,
              confidence: entityCandidate.confidence,
            },
            select: { id: true },
          });
          await tx.researchEntityCandidateEvidence.createMany({
            data: entityCandidate.evidenceIds.map((evidenceId) => ({
              candidateId: created.id,
              evidenceId,
            })),
          });
          candidateIds.set(entityCandidate.localId, created.id);
        }
        for (const relationCandidate of output.relationCandidates ?? []) {
          const fromCandidateId = candidateIds.get(relationCandidate.fromLocalId);
          const toCandidateId = candidateIds.get(relationCandidate.toLocalId);
          if (!fromCandidateId || !toCandidateId)
            throw new Error('AI relation candidate references unknown entity candidate');
          const created = await tx.researchRelationCandidate.create({
            data: {
              projectId: job.projectId,
              fromCandidateId,
              toCandidateId,
              relationTypeId: relationCandidate.relationTypeId,
              explanation: relationCandidate.explanation,
              confidence: relationCandidate.confidence,
            },
            select: { id: true },
          });
          await tx.researchRelationCandidateEvidence.createMany({
            data: relationCandidate.evidenceIds.map((evidenceId) => ({
              candidateId: created.id,
              evidenceId,
            })),
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

    const entityCandidates = Array.isArray((output as FindingProposalOutput).entityCandidates)
      ? ((output as FindingProposalOutput).entityCandidates ?? []).map((candidate) => {
          const localId = typeof candidate.localId === 'string' ? candidate.localId.trim() : '';
          const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
          const evidenceIds = Array.isArray(candidate.evidenceIds)
            ? [...new Set(candidate.evidenceIds)]
            : [];
          if (
            !localId ||
            !title ||
            !['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'].includes(
              candidate.kind,
            ) ||
            !evidenceIds.length ||
            evidenceIds.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))
          )
            throw new Error('Invalid AI entity candidate');
          const confidence =
            typeof candidate.confidence === 'number' &&
            candidate.confidence >= 0 &&
            candidate.confidence <= 1
              ? candidate.confidence
              : null;
          return {
            localId,
            kind: candidate.kind,
            title,
            summary: typeof candidate.summary === 'string' ? candidate.summary : null,
            confidence,
            evidenceIds,
          };
        })
      : [];
    const localIds = new Set(entityCandidates.map((candidate) => candidate.localId));
    const relationCandidates = Array.isArray((output as FindingProposalOutput).relationCandidates)
      ? ((output as FindingProposalOutput).relationCandidates ?? []).map((candidate) => {
          const fromLocalId =
            typeof candidate.fromLocalId === 'string' ? candidate.fromLocalId.trim() : '';
          const toLocalId =
            typeof candidate.toLocalId === 'string' ? candidate.toLocalId.trim() : '';
          const evidenceIds = Array.isArray(candidate.evidenceIds)
            ? [...new Set(candidate.evidenceIds)]
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
            throw new Error('Invalid AI relation candidate');
          const confidence =
            typeof candidate.confidence === 'number' &&
            candidate.confidence >= 0 &&
            candidate.confidence <= 1
              ? candidate.confidence
              : null;
          return {
            fromLocalId,
            toLocalId,
            relationTypeId:
              typeof candidate.relationTypeId === 'string' ? candidate.relationTypeId : null,
            explanation: typeof candidate.explanation === 'string' ? candidate.explanation : null,
            confidence,
            evidenceIds,
          };
        })
      : [];
    return { proposals, entityCandidates, relationCandidates };
  }
}
