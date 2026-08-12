import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  Prisma,
  ResearchClaimKind,
  ResearchFindingProposalType,
  LibraryMaterialVersionStatus,
  SourceType,
  type KnowledgeEntityKind,
} from '@prisma/client';
import { AIProvider, type AIProviderPort } from '../ai/ai.provider';
import { PrismaService } from '../prisma/prisma.service';

const EXTRACT_FINDINGS_TASK = 'research.extract_findings';
const EXTRACT_FINDINGS_SCHEMA_VERSION = '3';
const MAX_CORPUS_SEGMENTS = 80;
const MAX_SEGMENT_CHARS = 1_400;
const EVIDENCE_BATCH_SIZE = 5;
const ENTITY_KINDS: KnowledgeEntityKind[] = [
  'PERSON',
  'WORK',
  'ABSTRACTION',
  'EVENT',
  'PLACE',
  'ORGANIZATION',
];
const EXTRACT_FINDINGS_OUTPUT_SCHEMA = (relationTypeIds: string[], evidenceIds: string[]) =>
  ({
    type: 'object',
    additionalProperties: false,
    required: ['claims', 'entities', 'relations'],
    properties: {
      claims: {
        type: 'array',
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['localId', 'title', 'kind', 'evidenceIds'],
          properties: {
            localId: { type: 'string' },
            title: { type: 'string' },
            summary: { type: ['string', 'null'] },
            kind: { type: 'string', enum: Object.values(ResearchClaimKind) },
            evidenceIds: {
              type: 'array',
              minItems: 1,
              items: { type: 'string', enum: evidenceIds },
            },
          },
        },
      },
      entities: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['localId', 'kind', 'title', 'evidenceIds'],
          properties: {
            localId: { type: 'string' },
            kind: { type: 'string', enum: ENTITY_KINDS },
            title: { type: 'string' },
            summary: { type: ['string', 'null'] },
            evidenceIds: {
              type: 'array',
              minItems: 1,
              items: { type: 'string', enum: evidenceIds },
            },
          },
        },
      },
      relations: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['localId', 'fromLocalId', 'toLocalId', 'evidenceIds'],
          properties: {
            localId: { type: 'string' },
            fromLocalId: { type: 'string' },
            toLocalId: { type: 'string' },
            relationTypeId: { type: ['string', 'null'], enum: [null, ...relationTypeIds] },
            explanation: { type: ['string', 'null'] },
            evidenceIds: {
              type: 'array',
              minItems: 1,
              items: { type: 'string', enum: evidenceIds },
            },
          },
        },
      },
    },
  }) as const;

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
    const input = await this.buildExtractFindingsInput(job);
    const batches = this.batch(input.evidence, EVIDENCE_BATCH_SIZE);
    await this.prisma.researchJob.update({
      where: { id: job.id },
      data: { progressCurrent: 0, progressTotal: batches.length },
    });

    for (const [index, evidence] of batches.entries()) {
      const batchInput = {
        ...input,
        evidence,
        batch: { current: index + 1, total: batches.length },
      };
      const startedAt = Date.now();
      const execution = await this.prisma.aIExecution.create({
        data: {
          jobId: job.id,
          projectId: job.projectId,
          task: EXTRACT_FINDINGS_TASK,
          provider: metadata.provider,
          model: metadata.model,
          providerVersion: metadata.version ?? null,
          input: batchInput,
        },
        select: { id: true },
      });
      try {
        if (!this.provider.isAvailable()) throw new Error('AI provider is not available');
        const result = await this.provider.runStructured({
          task: EXTRACT_FINDINGS_TASK,
          schemaVersion: EXTRACT_FINDINGS_SCHEMA_VERSION,
          input: batchInput,
          outputSchema: EXTRACT_FINDINGS_OUTPUT_SCHEMA(
            input.relationTypes.map((item) => item.id),
            evidence.map((item) => item.id),
          ),
          maxOutputTokens: 1_200,
        });
        const output = this.namespaceOutput(
          this.validateExtractFindingsOutput(
            result.output,
            evidence.map((item) => item.id),
            input.relationTypes.map((item) => item.id),
          ),
          index + 1,
        );
        await this.prisma.$transaction(async (tx) => {
          await tx.aIExecution.update({
            where: { id: execution.id },
            data: {
              output,
              durationMs: result.durationMs ?? Date.now() - startedAt,
              costCents: result.costCents ?? null,
            },
          });
          for (const proposal of this.proposalsFromOutput(output))
            await this.persistProposal(tx, job, execution.id, proposal);
          await tx.researchJob.update({
            where: { id: job.id },
            data: { progressCurrent: index + 1 },
          });
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
  }

  private async buildExtractFindingsInput(job: ExtractFindingsJob) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: job.projectId },
      select: { id: true, title: true, objective: true, scope: true },
    });
    if (!project) throw new Error('Research project not found');

    if (!job.sourceId) await this.ensureCorpusEvidence(job.projectId);
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
      throw new Error('No hay corpus preparado ni Evidence disponible para analizar');

    const [sections, relationTypes] = await Promise.all([
      this.prisma.researchOutlineSection.findMany({
        where: { projectId: job.projectId },
        orderBy: [{ parentSectionId: 'asc' }, { sortOrder: 'asc' }],
        select: {
          title: true,
          objective: true,
          notes: true,
          questions: { orderBy: { sortOrder: 'asc' }, select: { text: true } },
          drafts: {
            where: { archivedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { title: true, currentRevision: { select: { content: true } } },
          },
        },
      }),
      this.prisma.relationType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, key: true, label: true },
      }),
    ]);

    return {
      project,
      sourceId: job.sourceId,
      evidence: evidence.map((item) => ({
        ...item,
        quote: item.quote?.slice(0, MAX_SEGMENT_CHARS) ?? null,
        context: item.context?.slice(0, 600) ?? null,
        note: item.note?.slice(0, 600) ?? null,
      })),
      editorialContext: sections.map((section) => ({
        title: section.title,
        objective: section.objective,
        notes: section.notes,
        questions: section.questions.map((question) => question.text),
        draft: section.drafts[0]?.currentRevision?.content?.slice(0, 2_000) ?? null,
      })),
      canonicalEntityKinds: ['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'],
      relationTypes,
      outputContract:
        'Devuelve sólo propuestas relevantes para el objetivo y el Índice. Contrato mecánico: localId es un identificador local y temporal sin significado semántico. Cada Claim, Entity y Relation debe tener localId, y cada localId debe ser único dentro de su propio array; no reutilices evidenceIds, sourceIds, relationTypeIds ni IDs de entidades existentes como localId. Ejemplos válidos: claim-1, claim-2; entity-1, entity-2; relation-1, relation-2. En cada Relation, fromLocalId y toLocalId deben copiar exactamente los localId de dos Entities distintas incluidas en entities de esta misma respuesta; no uses evidenceIds, títulos ni IDs externos como endpoints. relationTypeId debe ser exactamente el campo id de uno de los objetos entregados en relationTypes, nunca su key ni su label; por ejemplo, para { id: "rt_123", key: "CREATED_BY", label: "Creada por" }, devuelve "relationTypeId": "rt_123", no "CREATED_BY" ni "Creada por". Usa null si ningún RelationType encaja. Usa exactamente los evidenceIds del lote. Omite menciones administrativas o periféricas sin valor editorial. Usa [] cuando no haya propuestas.',
    };
  }

  private async ensureCorpusEvidence(projectId: string) {
    const materials = await this.prisma.researchLibraryMaterial.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: {
        material: {
          select: {
            id: true,
            sourceId: true,
            title: true,
            versions: {
              where: { status: LibraryMaterialVersionStatus.READY, content: { not: null } },
              orderBy: { version: 'desc' },
              take: 1,
              select: { id: true, version: true, content: true },
            },
          },
        },
      },
    });

    const segments = materials
      .flatMap(({ material }) => {
        const version = material.versions[0];
        if (!version?.content?.trim()) return [];
        return this.segmentContent(version.content).map((text, index) => ({
          materialId: material.id,
          sourceId: material.sourceId,
          title: material.title,
          versionId: version.id,
          version: version.version,
          locator: `Segmento ${index + 1}`,
          text,
        }));
      })
      .slice(0, MAX_CORPUS_SEGMENTS);
    if (!segments.length) return [];

    return this.prisma.$transaction(async (tx) => {
      const sourceIds = new Map<string, string>();
      const prepared = [] as Array<{
        evidenceId: string;
        materialTitle: string;
        locator: string;
        text: string;
      }>;
      for (const segment of segments) {
        let sourceId = segment.sourceId;
        if (!sourceId) {
          sourceId =
            sourceIds.get(segment.materialId) ??
            (
              await tx.source.create({
                data: { type: SourceType.ARTICLE, title: segment.title },
                select: { id: true },
              })
            ).id;
          sourceIds.set(segment.materialId, sourceId);
          await tx.libraryMaterial.update({
            where: { id: segment.materialId },
            data: { sourceId },
          });
        }
        await tx.researchProjectSource.upsert({
          where: { projectId_sourceId: { projectId, sourceId } },
          create: { projectId, sourceId },
          update: {},
        });
        const excerpt = await tx.libraryExcerpt.upsert({
          where: {
            materialVersionId_fingerprint: {
              materialVersionId: segment.versionId,
              fingerprint: this.fingerprint(segment.locator, segment.text),
            },
          },
          create: {
            materialVersionId: segment.versionId,
            locator: segment.locator,
            text: segment.text,
            fingerprint: this.fingerprint(segment.locator, segment.text),
          },
          update: {},
          select: { id: true },
        });
        const evidence = await tx.researchEvidence.upsert({
          where: {
            projectId_sourceId_fingerprint: {
              projectId,
              sourceId,
              fingerprint: this.fingerprint(segment.versionId, segment.locator, segment.text),
            },
          },
          create: {
            projectId,
            sourceId,
            libraryExcerptId: excerpt.id,
            sourceVersion: `material-v${segment.version}`,
            locator: segment.locator,
            quote: segment.text,
            fingerprint: this.fingerprint(segment.versionId, segment.locator, segment.text),
          },
          update: { libraryExcerptId: excerpt.id, quote: segment.text },
          select: { id: true },
        });
        prepared.push({
          evidenceId: evidence.id,
          materialTitle: segment.title,
          locator: segment.locator,
          text: segment.text,
        });
      }
      return prepared;
    });
  }

  private segmentContent(content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim();
    const segments: string[] = [];
    for (
      let offset = 0;
      offset < normalized.length && segments.length < MAX_CORPUS_SEGMENTS;
      offset += MAX_SEGMENT_CHARS
    ) {
      segments.push(normalized.slice(offset, offset + MAX_SEGMENT_CHARS));
    }
    return segments;
  }

  private fingerprint(...parts: string[]) {
    return createHash('sha256').update(parts.join('\u001f')).digest('hex');
  }

  private batch<T>(items: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
      items.slice(index * size, (index + 1) * size),
    );
  }

  private namespaceOutput(output: FindingProposalOutput, batch: number): FindingProposalOutput {
    const prefix = `b${batch}:`;
    return {
      claims: output.claims.map((item) => ({ ...item, localId: `${prefix}claim:${item.localId}` })),
      entities: output.entities.map((item) => ({
        ...item,
        localId: `${prefix}entity:${item.localId}`,
      })),
      relations: output.relations.map((item) => ({
        ...item,
        localId: `${prefix}relation:${item.localId}`,
        fromLocalId: `${prefix}entity:${item.fromLocalId}`,
        toLocalId: `${prefix}entity:${item.toLocalId}`,
      })),
    };
  }

  private validateExtractFindingsOutput(
    output: unknown,
    evidenceIds: string[],
    relationTypeIds: string[],
  ): FindingProposalOutput {
    if (!output || typeof output !== 'object')
      throw new Error('Invalid AI output for finding extraction');
    const raw = output as Record<string, unknown>;
    const rawClaims = Array.isArray(raw.claims) ? raw.claims : [];
    const rawEntities = Array.isArray(raw.entities) ? raw.entities : [];
    const rawRelations = Array.isArray(raw.relations) ? raw.relations : [];
    if (!Array.isArray(raw.claims) && !Array.isArray(raw.entities) && !Array.isArray(raw.relations))
      throw new Error('Invalid AI output for finding extraction');
    const knownEvidenceIds = new Set(evidenceIds);
    const support = (value: unknown) => {
      if (!Array.isArray(value)) return null;
      const ids = [...new Set(value)];
      if (!ids.length || ids.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))) {
        return null;
      }
      return ids as string[];
    };
    const key = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const claims = rawClaims.flatMap((value) => {
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
      const evidenceIds = support(item.evidenceIds);
      if (!evidenceIds) return [];
      return [
        {
          localId,
          title,
          summary: typeof item.summary === 'string' ? item.summary : null,
          kind: item.kind as ResearchClaimKind,
          evidenceIds,
        },
      ];
    });
    const entities = rawEntities.flatMap((value) => {
      const item = value as Record<string, unknown>;
      const localId = key(item.localId);
      const title = key(item.title);
      if (!localId || !title || !ENTITY_KINDS.includes(item.kind as KnowledgeEntityKind)) {
        throw new Error('Invalid AI entity proposal');
      }
      const evidenceIds = support(item.evidenceIds);
      if (!evidenceIds) return [];
      return [
        {
          localId,
          title,
          summary: typeof item.summary === 'string' ? item.summary : null,
          kind: item.kind as KnowledgeEntityKind,
          evidenceIds,
        },
      ];
    });
    const entityKeys = new Set(entities.map((item) => item.localId));
    const knownRelationTypeIds = new Set(relationTypeIds);
    const relations = rawRelations.flatMap((value) => {
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
        return [];
      }
      const evidenceIds = support(item.evidenceIds);
      if (!evidenceIds) return [];
      return [
        {
          localId,
          fromLocalId,
          toLocalId,
          relationTypeId: knownRelationTypeIds.has(key(item.relationTypeId))
            ? key(item.relationTypeId)
            : null,
          explanation: typeof item.explanation === 'string' ? item.explanation : null,
          evidenceIds,
        },
      ];
    });
    for (const items of [claims, entities, relations]) {
      const keys = items.map((item) => item.localId);
      if (new Set(keys).size !== keys.length) throw new Error('AI proposal keys must be unique');
    }
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
    const { evidenceIds, ...proposalData } = proposal;
    let created: { id: string };
    try {
      created = await tx.researchFindingProposal.create({
        data: {
          projectId: job.projectId,
          jobId: job.id,
          aiExecutionId,
          resultFingerprint,
          ...proposalData,
        },
        select: { id: true },
      });
    } catch (error) {
      // The partial unique index is the concurrency-safe half of the idempotency contract.
      if ((error as { code?: unknown }).code === 'P2002') return;
      throw error;
    }
    await tx.researchFindingProposalEvidence.createMany({
      data: evidenceIds.map((evidenceId) => ({ proposalId: created.id, evidenceId })),
    });
  }
}
