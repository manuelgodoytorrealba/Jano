import type { PrismaService } from '../prisma/prisma.service';
import { diagnoseStructuredOutput } from '../ai/ai-structured-output.diagnostics';
import { ResearchAIService } from './research-ai.service';

describe('ResearchAIService', () => {
  const tx = {
    aIExecution: { update: jest.fn() },
    researchFindingProposal: { findFirst: jest.fn(), create: jest.fn() },
    researchFindingProposalEvidence: { createMany: jest.fn() },
    researchJob: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    researchProject: { findUnique: jest.fn() },
    researchEvidence: { findMany: jest.fn() },
    researchOutlineSection: { findMany: jest.fn() },
    relationType: { findMany: jest.fn() },
    researchLibraryMaterial: { findMany: jest.fn() },
    researchJob: { update: jest.fn() },
    aIExecution: { create: jest.fn(), update: jest.fn() },
  };
  const provider = {
    metadata: jest.fn(),
    isAvailable: jest.fn(),
    runStructured: jest.fn(),
  };
  let service: ResearchAIService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    provider.metadata.mockReturnValue({ provider: 'noop', model: 'unavailable' });
    service = new ResearchAIService(prisma as unknown as PrismaService, provider);
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      title: 'Goya',
      objective: 'Reunir evidencias',
      scope: null,
    });
    prisma.researchEvidence.findMany.mockResolvedValue([
      {
        id: 'evidence-1',
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: 'p. 1',
        quote: 'Fragmento',
        context: null,
        note: null,
      },
    ]);
    prisma.researchOutlineSection.findMany.mockResolvedValue([]);
    prisma.relationType.findMany.mockResolvedValue([]);
    prisma.researchLibraryMaterial.findMany.mockResolvedValue([]);
    prisma.aIExecution.create.mockResolvedValue({ id: 'execution-1' });
  });

  it('records a failed execution when the provider is unavailable', async () => {
    provider.isAvailable.mockReturnValue(false);
    prisma.aIExecution.update.mockResolvedValue({ id: 'execution-1' });

    await expect(
      service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null }),
    ).rejects.toThrow('AI provider is not available');

    expect(prisma.aIExecution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobId: 'job-1',
        projectId: 'project-1',
        task: 'research.extract_findings',
        provider: 'noop',
        model: 'unavailable',
        input: expect.objectContaining({ batch: { current: 1, total: 1 } }),
      }),
      select: { id: true },
    });
    expect(prisma.aIExecution.update).toHaveBeenCalledWith({
      where: { id: 'execution-1' },
      data: {
        durationMs: expect.any(Number),
        error: 'AI provider is not available',
      },
    });
    expect(provider.runStructured).not.toHaveBeenCalled();
  });

  it('stores private finding proposals for valid structured output', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      durationMs: 12,
      output: {
        claims: [
          {
            localId: 'claim-1',
            title: 'Hallazgo documental',
            summary: 'Una lectura posible',
            kind: 'ASSERTION',
            evidenceIds: ['evidence-1'],
          },
        ],
        entities: [],
        relations: [],
      },
    });
    tx.aIExecution.update.mockResolvedValue({ id: 'execution-1' });
    tx.researchFindingProposal.findFirst.mockResolvedValue(null);
    tx.researchFindingProposal.create.mockResolvedValue({ id: 'proposal-1' });
    tx.researchFindingProposalEvidence.createMany.mockResolvedValue({ count: 1 });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: 'source-1' });

    expect(provider.runStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'research.extract_findings',
        schemaVersion: '3',
        input: expect.objectContaining({
          sourceId: 'source-1',
          outputContract: expect.stringContaining(
            'cada localId debe ser único dentro de su propio array',
          ),
        }),
        maxOutputTokens: 1_200,
      }),
    );
    const outputContract = provider.runStructured.mock.calls[0][0].input.outputContract as string;
    expect(outputContract).toContain(
      'fromLocalId y toLocalId deben copiar exactamente los localId',
    );
    expect(outputContract).toContain('relationTypeId debe ser exactamente el campo id');
    expect(outputContract).toContain('nunca su key ni su label');
    expect(outputContract).toContain('"relationTypeId": "rt_123"');
    const outputSchema = provider.runStructured.mock.calls[0][0].outputSchema as {
      properties: { relations: { items: { properties: { relationTypeId: { enum: unknown[] } } } } };
    };
    expect(outputSchema.properties.relations.items.properties.relationTypeId.enum).toEqual([null]);
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        jobId: 'job-1',
        aiExecutionId: 'execution-1',
        type: 'CLAIM',
        proposalKey: 'b1:claim:claim-1',
        title: 'Hallazgo documental',
        summary: 'Una lectura posible',
        kind: 'ASSERTION',
        claimKind: 'ASSERTION',
        entityKind: null,
        relationFromKey: null,
        relationToKey: null,
        relationTypeId: null,
        explanation: null,
        resultFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      select: { id: true },
    });
    expect(tx.researchFindingProposalEvidence.createMany).toHaveBeenCalledWith({
      data: [{ proposalId: 'proposal-1', evidenceId: 'evidence-1' }],
    });
  });

  it('constrains relationTypeId to the active IDs and null', async () => {
    prisma.relationType.findMany.mockResolvedValue([
      { id: 'rt-created', key: 'CREATED_BY', label: 'Creado por' },
      { id: 'rt-part', key: 'PART_OF', label: 'Forma parte de' },
    ]);
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: { claims: [], entities: [], relations: [] },
    });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });

    const schema = provider.runStructured.mock.calls[0][0].outputSchema as {
      properties: { relations: { items: { properties: { relationTypeId: { enum: unknown[] } } } } };
    };
    expect(schema.properties.relations.items.properties.relationTypeId.enum).toEqual([
      null,
      'rt-created',
      'rt-part',
    ]);
    for (const allowed of [null, 'rt-created', 'rt-part']) {
      const diagnostic = diagnoseStructuredOutput({
        rawResponse: JSON.stringify({
          claims: [],
          entities: [],
          relations: [
            {
              localId: 'relation-1',
              fromLocalId: 'entity-1',
              toLocalId: 'entity-2',
              relationTypeId: allowed,
              evidenceIds: ['evidence-1'],
            },
          ],
        }),
        attempt: 1,
        outputSchema: schema,
      });
      expect(diagnostic.schemaValidationErrors).toEqual([]);
    }
    for (const invalid of [
      'CREATED_BY',
      'PART_OF',
      'Creado por',
      'Forma parte de',
      'rt-invented',
    ]) {
      const diagnostic = diagnoseStructuredOutput({
        rawResponse: JSON.stringify({
          claims: [],
          entities: [],
          relations: [
            {
              localId: 'relation-1',
              fromLocalId: 'entity-1',
              toLocalId: 'entity-2',
              relationTypeId: invalid,
              evidenceIds: ['evidence-1'],
            },
          ],
        }),
        attempt: 1,
        outputSchema: schema,
      });
      expect(diagnostic.schemaValidationErrors).toContainEqual(
        expect.objectContaining({
          path: '$.relations[0].relationTypeId',
          message: 'value is not in enum',
        }),
      );
    }

    prisma.relationType.findMany.mockResolvedValue([
      { id: 'rt-other', key: 'OTHER', label: 'Otra' },
    ]);
    await service.extractFindings({ id: 'job-2', projectId: 'project-1', sourceId: null });
    const changedSchema = provider.runStructured.mock.calls[1][0].outputSchema as typeof schema;
    expect(changedSchema.properties.relations.items.properties.relationTypeId.enum).toEqual([
      null,
      'rt-other',
    ]);
  });

  it('constrains Evidence IDs in Claims, Entities and Relations to the current batch', async () => {
    prisma.researchEvidence.findMany.mockResolvedValue(
      ['ev-1', 'ev-2', 'ev-3'].map((id) => ({
        id,
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: id,
        quote: 'Fragmento',
        context: null,
        note: null,
      })),
    );
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: { claims: [], entities: [], relations: [] },
    });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });

    const schema = provider.runStructured.mock.calls[0][0].outputSchema as {
      properties: Record<
        string,
        { items: { properties: { evidenceIds: { items: { enum: string[] } } } } }
      >;
    };
    for (const section of ['claims', 'entities', 'relations']) {
      expect(schema.properties[section].items.properties.evidenceIds.items.enum).toEqual([
        'ev-1',
        'ev-2',
        'ev-3',
      ]);
    }
    for (const invalid of ['ev-4', 'ev1', 'source-1', 'entity-1', 'EV-1']) {
      const diagnostic = diagnoseStructuredOutput({
        rawResponse: JSON.stringify({
          claims: [
            { localId: 'claim-1', title: 'Claim', kind: 'ASSERTION', evidenceIds: [invalid] },
          ],
          entities: [
            { localId: 'entity-1', title: 'Entity', kind: 'PERSON', evidenceIds: [invalid] },
          ],
          relations: [
            {
              localId: 'relation-1',
              fromLocalId: 'entity-1',
              toLocalId: 'entity-2',
              relationTypeId: null,
              evidenceIds: [invalid],
            },
          ],
        }),
        attempt: 1,
        outputSchema: schema,
      });
      expect(diagnostic.schemaValidationErrors.map((error) => error.path)).toEqual([
        '$.claims[0].evidenceIds[0]',
        '$.entities[0].evidenceIds[0]',
        '$.relations[0].evidenceIds[0]',
      ]);
    }
  });

  it('drops only proposals that reference evidence outside the execution input', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: {
        claims: [
          {
            localId: 'claim-1',
            title: 'Hallazgo',
            kind: 'ASSERTION',
            evidenceIds: ['missing-evidence'],
          },
        ],
        entities: [],
        relations: [],
      },
    });
    prisma.aIExecution.update.mockResolvedValue({ id: 'execution-1' });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });

    expect(tx.researchFindingProposal.create).not.toHaveBeenCalled();
    expect(tx.aIExecution.update).toHaveBeenCalledWith({
      where: { id: 'execution-1' },
      data: expect.objectContaining({ output: { claims: [], entities: [], relations: [] } }),
    });
  });

  it('persists Entity and Relation as proposals without creating private knowledge', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: {
        claims: [
          {
            localId: 'entity-1',
            kind: 'ASSERTION',
            title: 'Goya es autor',
            evidenceIds: ['evidence-1'],
          },
        ],
        entities: [
          { localId: 'entity-1', kind: 'PERSON', title: 'Goya', evidenceIds: ['evidence-1'] },
          {
            localId: 'entity-2',
            kind: 'WORK',
            title: 'Los desastres',
            evidenceIds: ['evidence-1'],
          },
        ],
        relations: [
          {
            localId: 'relation-1',
            fromLocalId: 'entity-1',
            toLocalId: 'entity-2',
            explanation: 'Autor de',
            relationTypeId: 'invented-relation-type',
            evidenceIds: ['evidence-1'],
          },
          {
            localId: 'unresolved-relation',
            fromLocalId: 'entity-1',
            toLocalId: 'missing-entity',
            evidenceIds: ['evidence-1'],
          },
        ],
      },
    });
    tx.researchFindingProposal.findFirst.mockResolvedValue(null);
    tx.researchFindingProposal.create.mockImplementation(async ({ data }) => ({
      id: data.proposalKey,
    }));

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });

    expect(tx.researchFindingProposal.create).toHaveBeenCalledTimes(4);
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proposalKey: 'b1:claim:entity-1', type: 'CLAIM' }),
      }),
    );
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'ENTITY',
          jobId: 'job-1',
          aiExecutionId: 'execution-1',
          entityKind: 'PERSON',
        }),
      }),
    );
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'RELATION',
          relationFromKey: 'b1:entity:entity-1',
          relationToKey: 'b1:entity:entity-2',
          relationTypeId: null,
        }),
      }),
    );
    expect((tx as Record<string, unknown>).researchEntity).toBeUndefined();
    expect((tx as Record<string, unknown>).researchClaim).toBeUndefined();
    expect((tx as Record<string, unknown>).researchRelation).toBeUndefined();
  });

  it('does not duplicate a typed result when the same Job is retried, but permits a different Job', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: {
        claims: [
          { localId: 'claim-1', title: 'Hallazgo', kind: 'ASSERTION', evidenceIds: ['evidence-1'] },
        ],
        entities: [],
        relations: [],
      },
    });
    tx.researchFindingProposal.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);
    tx.researchFindingProposal.create.mockResolvedValue({ id: 'proposal-1' });
    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });
    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null });
    await service.extractFindings({ id: 'job-2', projectId: 'project-1', sourceId: null });
    expect(tx.researchFindingProposal.create).toHaveBeenCalledTimes(2);
    expect(tx.researchFindingProposal.create.mock.calls[1][0].data.jobId).toBe('job-2');
  });

  it('analyzes large evidence sets in bounded batches and persists progress', async () => {
    provider.isAvailable.mockReturnValue(true);
    prisma.researchEvidence.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `evidence-${index + 1}`,
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: `p. ${index + 1}`,
        quote: 'Fragmento',
        context: null,
        note: null,
      })),
    );
    provider.runStructured.mockImplementation(async ({ input }) => {
      const evidence = (input as { evidence: Array<{ id: string }> }).evidence;
      return {
        output: {
          claims: [
            {
              localId: 'claim',
              title: 'Hallazgo',
              kind: 'ASSERTION',
              evidenceIds: [evidence[0].id],
            },
          ],
          entities: [],
          relations: [],
        },
      };
    });
    tx.researchFindingProposal.findFirst.mockResolvedValue(null);
    tx.researchFindingProposal.create.mockResolvedValue({ id: 'proposal' });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: 'source-1' });

    expect(provider.runStructured).toHaveBeenCalledTimes(2);
    const evidenceEnum = (call: (typeof provider.runStructured.mock.calls)[number]) => {
      const schema = call[0].outputSchema as {
        properties: {
          claims: { items: { properties: { evidenceIds: { items: { enum: string[] } } } } };
        };
      };
      return schema.properties.claims.items.properties.evidenceIds.items.enum;
    };
    expect(evidenceEnum(provider.runStructured.mock.calls[0])).toEqual([
      'evidence-1',
      'evidence-2',
      'evidence-3',
      'evidence-4',
      'evidence-5',
    ]);
    expect(evidenceEnum(provider.runStructured.mock.calls[1])).toEqual(['evidence-6']);
    expect(prisma.researchJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { progressCurrent: 0, progressTotal: 2 },
    });
    expect(tx.researchJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: { progressCurrent: 2 },
    });
    expect(
      tx.researchFindingProposal.create.mock.calls.map((call) => call[0].data.proposalKey),
    ).toEqual(['b1:claim:claim', 'b2:claim:claim']);
  });
});
