import type { PrismaService } from '../prisma/prisma.service';
import { ResearchAIService } from './research-ai.service';

describe('ResearchAIService', () => {
  const tx = {
    aIExecution: { update: jest.fn() },
    researchFindingProposal: { create: jest.fn() },
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
        proposals: [
          {
            title: '  Hallazgo documental  ',
            summary: '  Una lectura posible  ',
            kind: '  attribution  ',
            evidenceIds: ['evidence-1'],
          },
        ],
      },
    });
    tx.aIExecution.update.mockResolvedValue({ id: 'execution-1' });
    tx.researchFindingProposal.create.mockResolvedValue({ id: 'proposal-1' });
    tx.researchFindingProposalEvidence.createMany.mockResolvedValue({ count: 1 });

    await service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: 'source-1' });

    expect(provider.runStructured).toHaveBeenCalledWith({
      task: 'research.extract_findings',
      schemaVersion: '2',
      input: expect.objectContaining({ sourceId: 'source-1' }),
    });
    expect(tx.researchFindingProposal.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        aiExecutionId: 'execution-1',
        title: 'Hallazgo documental',
        summary: 'Una lectura posible',
        kind: 'attribution',
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
      output: { proposals: [{ title: 'Hallazgo', evidenceIds: ['missing-evidence'] }] },
    });
    prisma.aIExecution.update.mockResolvedValue({ id: 'execution-1' });

    await expect(
      service.extractFindings({ id: 'job-1', projectId: 'project-1', sourceId: null }),
    ).rejects.toThrow('AI finding proposal references unknown evidence');

    expect(tx.researchFindingProposal.create).not.toHaveBeenCalled();
    expect(prisma.aIExecution.update).toHaveBeenCalledWith({
      where: { id: 'execution-1' },
      data: {
        durationMs: expect.any(Number),
        error: 'AI finding proposal references unknown evidence',
      },
    });
  });
});
