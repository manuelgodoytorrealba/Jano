import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  Prisma,
  ResearchClaimKind,
  ResearchFindingProposalType,
  type KnowledgeEntityKind,
} from '@prisma/client';
import { AIProvider, type AIProviderPort } from '../ai/ai.provider';
import { PrismaService } from '../prisma/prisma.service';

const EXTRACT_FINDINGS_TASK = 'research.extract_findings';
const EXTRACT_FINDINGS_SCHEMA_VERSION = '3';
const ENTITY_KINDS: KnowledgeEntityKind[] = [
  'PERSON',
  'WORK',
  'ABSTRACTION',
  'EVENT',
  'PLACE',
  'ORGANIZATION',
];

type ExtractFindingsJob = {
  id: string;
  projectId: string;
  sourceId: string | null;
};

type FindingProposalOutput = {
  claims: Array<{
    localId: string;
    title: string;
    summary?: string | null;
    kind: ResearchClaimKind;
    evidenceIds: string[];
  }>;
  entities: Array<{
    localId: string;
    kind: KnowledgeEntityKind;
    title: string;
    summary?: string | null;
    evidenceIds: string[];
  }>;
  relations: Array<{
    localId: string;
    fromLocalId: string;
    toLocalId: string;
    relationTypeId?: string | null;
    explanation?: string | null;
    evidenceIds: string[];
  }>;
};

@Injectable()
export class ResearchAIService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AIProvider) private readonly provider: AIProviderPort,
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

        for (const proposal of this.proposalsFromOutput(output)) {
          await this.persistProposal(tx, job, execution.id, proposal);
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
    if (!output || typeof output !== 'object')
      throw new Error('Invalid AI output for finding extraction');
    const raw = output as Record<string, unknown>;
    if (
      !Array.isArray(raw.claims) ||
      !Array.isArray(raw.entities) ||
      !Array.isArray(raw.relations)
    ) {
      throw new Error('Invalid AI output for finding extraction');
    }
    const knownEvidenceIds = new Set(evidenceIds);
    const support = (value: unknown) => {
      if (!Array.isArray(value)) throw new Error('Invalid AI proposal evidence');
      const ids = [...new Set(value)];
      if (!ids.length || ids.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))) {
        throw new Error('AI proposal references unknown evidence');
      }
      return ids as string[];
    };
    const key = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const claims = raw.claims.map((value) => {
      const item = value as Record<string, unknown>;
      const localId = key(item.localId);
      const title = key(item.title);
      if (
        !localId ||
        !title ||
        !Object.values(ResearchClaimKind).includes(item.kind as ResearchClaimKind)
      ) {
        throw new Error('Invalid AI claim proposal');
      }
      return {
        localId,
        title,
        summary: typeof item.summary === 'string' ? item.summary : null,
        kind: item.kind as ResearchClaimKind,
        evidenceIds: support(item.evidenceIds),
      };
    });
    const entities = raw.entities.map((value) => {
      const item = value as Record<string, unknown>;
      const localId = key(item.localId);
      const title = key(item.title);
      if (!localId || !title || !ENTITY_KINDS.includes(item.kind as KnowledgeEntityKind)) {
        throw new Error('Invalid AI entity proposal');
      }
      return {
        localId,
        title,
        summary: typeof item.summary === 'string' ? item.summary : null,
        kind: item.kind as KnowledgeEntityKind,
        evidenceIds: support(item.evidenceIds),
      };
    });
    const entityKeys = new Set(entities.map((item) => item.localId));
    const relations = raw.relations.map((value) => {
      const item = value as Record<string, unknown>;
      const localId = key(item.localId);
      const fromLocalId = key(item.fromLocalId);
      const toLocalId = key(item.toLocalId);
      if (
        !localId ||
        !fromLocalId ||
        !toLocalId ||
        fromLocalId === toLocalId ||
        !entityKeys.has(fromLocalId) ||
        !entityKeys.has(toLocalId)
      ) {
        throw new Error('Invalid AI relation proposal');
      }
      return {
        localId,
        fromLocalId,
        toLocalId,
        relationTypeId: key(item.relationTypeId) || null,
        explanation: typeof item.explanation === 'string' ? item.explanation : null,
        evidenceIds: support(item.evidenceIds),
      };
    });
    const proposalKeys = [...claims, ...entities, ...relations].map((item) => item.localId);
    if (new Set(proposalKeys).size !== proposalKeys.length)
      throw new Error('AI proposal keys must be unique');
    return { claims, entities, relations };
  }

  private proposalsFromOutput(output: FindingProposalOutput) {
    return [
      ...output.claims.map((item) => ({
        type: ResearchFindingProposalType.CLAIM,
        proposalKey: item.localId,
        title: item.title,
        summary: item.summary ?? null,
        kind: item.kind,
        claimKind: item.kind,
        entityKind: null,
        relationFromKey: null,
        relationToKey: null,
        relationTypeId: null,
        explanation: null,
        evidenceIds: item.evidenceIds,
      })),
      ...output.entities.map((item) => ({
        type: ResearchFindingProposalType.ENTITY,
        proposalKey: item.localId,
        title: item.title,
        summary: item.summary ?? null,
        kind: null,
        claimKind: null,
        entityKind: item.kind,
        relationFromKey: null,
        relationToKey: null,
        relationTypeId: null,
        explanation: null,
        evidenceIds: item.evidenceIds,
      })),
      ...output.relations.map((item) => ({
        type: ResearchFindingProposalType.RELATION,
        proposalKey: item.localId,
        title: item.explanation?.trim() || 'Relación propuesta',
        summary: null,
        kind: null,
        claimKind: null,
        entityKind: null,
        relationFromKey: item.fromLocalId,
        relationToKey: item.toLocalId,
        relationTypeId: item.relationTypeId,
        explanation: item.explanation,
        evidenceIds: item.evidenceIds,
      })),
    ];
  }

  private async persistProposal(
    tx: Prisma.TransactionClient,
    job: ExtractFindingsJob,
    aiExecutionId: string,
    proposal: ReturnType<ResearchAIService['proposalsFromOutput']>[number],
  ) {
    // ponytail: the job identity plus typed result and Evidence makes retries idempotent; add a
    // dedicated result aggregate only if proposals later need cross-job reconciliation.
    const resultFingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          type: proposal.type,
          proposalKey: proposal.proposalKey,
          title: proposal.title,
          summary: proposal.summary,
          explanation: proposal.explanation,
          claimKind: proposal.claimKind,
          entityKind: proposal.entityKind,
          relationFromKey: proposal.relationFromKey,
          relationToKey: proposal.relationToKey,
          relationTypeId: proposal.relationTypeId,
          evidenceIds: [...proposal.evidenceIds].sort(),
        }),
      )
      .digest('hex');
    const existing = await tx.researchFindingProposal.findFirst({
      where: { jobId: job.id, resultFingerprint },
      select: { id: true },
    });
    if (existing) return;
    let created: { id: string };
    try {
      created = await tx.researchFindingProposal.create({
        data: {
          projectId: job.projectId,
          jobId: job.id,
          aiExecutionId,
          resultFingerprint,
          ...proposal,
        },
        select: { id: true },
      });
    } catch (error) {
      // The partial unique index is the concurrency-safe half of the idempotency contract.
      if ((error as { code?: unknown }).code === 'P2002') return;
      throw error;
    }
    await tx.researchFindingProposalEvidence.createMany({
      data: proposal.evidenceIds.map((evidenceId) => ({ proposalId: created.id, evidenceId })),
    });
  }
}
