import type { PrismaService } from '../prisma/prisma.service';
import { ResearchAIService } from './research-ai.service';

describe('ResearchAIService', () => {
  const tx = {
    aIExecution: { update: jest.fn() },
    researchFindingProposal: { findFirst: jest.fn(), create: jest.fn() },
    researchFindingProposalEvidence: { createMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    researchProject: { findUnique: jest.fn() },
    researchEvidence: { findMany: jest.fn() },
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
        input: { job: { id: 'job-1', projectId: 'project-1', sourceId: null } },
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

    expect(provider.runStructured).toHaveBeenCalledWith({
      task: 'research.extract_findings',
      schemaVersion: '3',
      input: expect.objectContaining({ sourceId: 'source-1' }),
    });
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        jobId: 'job-1',
        aiExecutionId: 'execution-1',
        type: 'CLAIM',
        proposalKey: 'claim-1',
        title: 'Hallazgo documental',
        summary: 'Una lectura posible',
        kind: 'ASSERTION',
        claimKind: 'ASSERTION',
        entityKind: null,
        relationFromKey: null,
        relationToKey: null,
        relationTypeId: null,
        explanation: null,
        evidenceIds: ['evidence-1'],
        resultFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      select: { id: true },
    });
    expect(tx.researchFindingProposalEvidence.createMany).toHaveBeenCalledWith({
      data: [{ proposalId: 'proposal-1', evidenceId: 'evidence-1' }],
    });
  });

  it('rejects output that references evidence outside the execution input', async () => {
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

    await expect(
      service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null }),
    ).rejects.toThrow('AI proposal references unknown evidence');

    expect(tx.researchFindingProposal.create).not.toHaveBeenCalled();
    expect(prisma.aIExecution.update).toHaveBeenCalledWith({
      where: { id: 'execution-1' },
      data: {
        durationMs: expect.any(Number),
        error: 'AI proposal references unknown evidence',
      },
    });
  });

  it('persists Entity and Relation as proposals without creating private knowledge', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.runStructured.mockResolvedValue({
      output: {
        claims: [],
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

    expect(tx.researchFindingProposal.create).toHaveBeenCalledTimes(3);
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
          relationFromKey: 'entity-1',
          relationToKey: 'entity-2',
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
});
