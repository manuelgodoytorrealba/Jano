import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ResearchDecisionAction,
  ResearchFindingStatus,
  ResearchJobType,
  ResearchProposalReviewState,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchService } from './research.service';

describe('ResearchService', () => {
  const tx = {
    researchFinding: { create: jest.fn(), update: jest.fn() },
    researchFindingEvidence: { createMany: jest.fn() },
    researchFindingProposal: { update: jest.fn() },
    researchDecision: { create: jest.fn() },
    researchProject: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    researchProject: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    researchProjectSource: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    researchEvidence: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    researchJob: {
      upsert: jest.fn(),
    },
    researchFinding: {
      findFirst: jest.fn(),
    },
    researchFindingProposal: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  let service: ResearchService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new ResearchService(prisma as unknown as PrismaService);
  });

  it('creates a project as private research state, not a canonical entity', async () => {
    prisma.researchProject.create.mockResolvedValue({ id: 'project-1' });

    await service.createProject({
      title: '  Goya y guerra  ',
      objective: '  Reunir evidencias documentales  ',
      scope: '  Prado  ',
    });

    expect(prisma.researchProject.create).toHaveBeenCalledWith({
      data: {
        title: 'Goya y guerra',
        objective: 'Reunir evidencias documentales',
        scope: 'Prado',
      },
    });
  });

  it('lists recent projects with lightweight research counts', async () => {
    prisma.researchProject.findMany.mockResolvedValue([]);

    await service.listProjects();

    expect(prisma.researchProject.findMany).toHaveBeenCalledWith({
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
  });

  it('opens one project with its research context', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      findings: [
        {
          id: 'finding-1',
          evidence: [{ evidenceId: 'evidence-1', evidence: { id: 'evidence-1' } }],
        },
      ],
    });

    await expect(service.getProject('project-1')).resolves.toEqual({
      id: 'project-1',
      findings: [
        {
          id: 'finding-1',
          evidence: [{ evidenceId: 'evidence-1', evidence: { id: 'evidence-1' } }],
        },
      ],
    });

    expect(prisma.researchProject.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-1' },
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
  });

  it('searches existing canonical sources without creating research-owned sources', async () => {
    prisma.source.findMany.mockResolvedValue([]);

    await service.searchSources({ q: '  Prado  ', limit: 5 });

    expect(prisma.source.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { title: { contains: 'Prado', mode: 'insensitive' } },
          { author: { contains: 'Prado', mode: 'insensitive' } },
          { publisher: { contains: 'Prado', mode: 'insensitive' } },
          { url: { contains: 'Prado', mode: 'insensitive' } },
          {
            translations: {
              some: {
                OR: [
                  { title: { contains: 'Prado', mode: 'insensitive' } },
                  { author: { contains: 'Prado', mode: 'insensitive' } },
                  { publisher: { contains: 'Prado', mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { translations: { orderBy: { locale: 'asc' } } },
    });
  });

  it('throws when a project does not exist', async () => {
    prisma.researchProject.findUnique.mockResolvedValue(null);

    await expect(service.getProject('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('associates an existing canonical source idempotently', async () => {
    prisma.researchProject.findUnique
      .mockResolvedValueOnce({ id: 'project-1' })
      .mockResolvedValueOnce({ id: 'project-1' });
    prisma.source.findUnique.mockResolvedValue({ id: 'source-1' });
    prisma.researchProjectSource.upsert.mockResolvedValue({ projectId: 'project-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });

    await service.addProjectSource('project-1', {
      sourceId: 'source-1',
      note: '  Corpus inicial  ',
    });

    expect(prisma.researchProjectSource.upsert).toHaveBeenCalledWith({
      where: { projectId_sourceId: { projectId: 'project-1', sourceId: 'source-1' } },
      create: { projectId: 'project-1', sourceId: 'source-1', note: 'Corpus inicial' },
      update: { note: 'Corpus inicial' },
    });
    expect(prisma.researchProject.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { lastActiveAt: expect.any(Date) },
    });
  });

  it('rejects source association when project or source is missing', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce(null);
    prisma.source.findUnique.mockResolvedValueOnce({ id: 'source-1' });

    await expect(
      service.addProjectSource('missing', { sourceId: 'source-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.source.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.addProjectSource('project-1', { sourceId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a queued source preparation job idempotently', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValue({ sourceId: 'source-1' });
    prisma.researchJob.upsert.mockResolvedValue({ id: 'job-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });

    await service.prepareSourceJob('project-1', 'source-1');
    await service.prepareSourceJob('project-1', 'source-1');

    expect(prisma.researchJob.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.researchJob.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        projectId_type_inputFingerprint: {
          projectId: 'project-1',
          type: ResearchJobType.PREPARE_SOURCE,
          inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: {
        projectId: 'project-1',
        sourceId: 'source-1',
        type: ResearchJobType.PREPARE_SOURCE,
        inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      update: {},
    });
    expect(prisma.researchJob.upsert.mock.calls[1][0].where).toEqual(
      prisma.researchJob.upsert.mock.calls[0][0].where,
    );
  });

  it('creates a queued finding extraction job idempotently', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchJob.upsert.mockResolvedValue({ id: 'job-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.extractFindingsJob('project-1');
    await service.extractFindingsJob('project-1');

    expect(prisma.researchJob.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.researchJob.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        projectId_type_inputFingerprint: {
          projectId: 'project-1',
          type: ResearchJobType.EXTRACT_FINDINGS,
          inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: {
        projectId: 'project-1',
        sourceId: null,
        type: ResearchJobType.EXTRACT_FINDINGS,
        inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      update: {},
    });
    expect(prisma.researchJob.upsert.mock.calls[1][0].where).toEqual(
      prisma.researchJob.upsert.mock.calls[0][0].where,
    );
  });

  it('rejects finding extraction for sources outside the project library', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValueOnce(null);

    await expect(service.extractFindingsJob('project-1', 'source-outside')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();
  });

  it('rejects source preparation when project or project source is missing', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce(null);

    await expect(service.prepareSourceJob('missing', 'source-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();

    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValueOnce(null);

    await expect(service.prepareSourceJob('project-1', 'source-outside')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();
  });

  it('marks an automatic finding proposal as reviewed without creating a finding', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchFindingProposal.update.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.reviewFindingProposal('project-1', 'proposal-1', {
      reviewState: ResearchProposalReviewState.REVIEWED,
    });

    expect(prisma.researchFindingProposal.findFirst).toHaveBeenCalledWith({
      where: { id: 'proposal-1', projectId: 'project-1' },
      select: { id: true },
    });
    expect(prisma.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { reviewState: ResearchProposalReviewState.REVIEWED },
    });
    expect(tx.researchFinding.create).not.toHaveBeenCalled();
  });

  it('rejects an automatic finding proposal without creating a finding', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchFindingProposal.update.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.reviewFindingProposal('project-1', 'proposal-1', {
      reviewState: ResearchProposalReviewState.REJECTED,
    });

    expect(prisma.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { reviewState: ResearchProposalReviewState.REJECTED },
    });
    expect(tx.researchFinding.create).not.toHaveBeenCalled();
  });

  it('rejects proposal review when the proposal is missing or outside the project', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewFindingProposal('project-1', 'proposal-outside', {
        reviewState: ResearchProposalReviewState.REJECTED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchFindingProposal.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported automatic proposal review states', async () => {
    await expect(
      service.reviewFindingProposal('project-1', 'proposal-1', {
        reviewState: ResearchProposalReviewState.PENDING as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.researchFindingProposal.findFirst).not.toHaveBeenCalled();
  });

  it('converts a reviewed automatic finding proposal into a private finding', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      title: 'Hallazgo revisado',
      summary: 'Resumen',
      kind: 'attribution',
      reviewState: ResearchProposalReviewState.REVIEWED,
      convertedFindingId: null,
      evidence: [{ evidenceId: 'evidence-1' }, { evidenceId: 'evidence-2' }],
    });
    tx.researchFinding.create.mockResolvedValue({ id: 'finding-1' });
    tx.researchFindingEvidence.createMany.mockResolvedValue({ count: 2 });
    tx.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.convertFindingProposalToFinding('project-1', 'proposal-1');

    expect(prisma.researchFindingProposal.findFirst).toHaveBeenCalledWith({
      where: { id: 'proposal-1', projectId: 'project-1' },
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
    expect(tx.researchFinding.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Hallazgo revisado',
        summary: 'Resumen',
        kind: 'attribution',
      },
      select: { id: true },
    });
    expect(tx.researchFindingEvidence.createMany).toHaveBeenCalledWith({
      data: [
        { findingId: 'finding-1', evidenceId: 'evidence-1' },
        { findingId: 'finding-1', evidenceId: 'evidence-2' },
      ],
    });
    expect(tx.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { convertedFindingId: 'finding-1' },
    });
  });

  it('does not create another finding when a reviewed proposal was already converted', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      title: 'Hallazgo revisado',
      summary: 'Resumen',
      kind: 'attribution',
      reviewState: ResearchProposalReviewState.REVIEWED,
      convertedFindingId: 'finding-existing',
      evidence: [{ evidenceId: 'evidence-1' }],
    });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.convertFindingProposalToFinding('project-1', 'proposal-1');
    await service.convertFindingProposalToFinding('project-1', 'proposal-1');

    expect(tx.researchFinding.create).not.toHaveBeenCalled();
    expect(tx.researchFindingEvidence.createMany).not.toHaveBeenCalled();
    expect(tx.researchFindingProposal.update).not.toHaveBeenCalled();
  });

  it('rejects conversion for pending or rejected automatic finding proposals', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValueOnce({
      id: 'proposal-1',
      reviewState: ResearchProposalReviewState.PENDING,
      convertedFindingId: null,
      evidence: [],
    });

    await expect(
      service.convertFindingProposalToFinding('project-1', 'proposal-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.researchFindingProposal.findFirst.mockResolvedValueOnce({
      id: 'proposal-2',
      reviewState: ResearchProposalReviewState.REJECTED,
      convertedFindingId: null,
      evidence: [],
    });

    await expect(
      service.convertFindingProposalToFinding('project-1', 'proposal-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.researchFinding.create).not.toHaveBeenCalled();
  });

  it('rejects conversion when the proposal is missing or outside the project', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue(null);

    await expect(
      service.convertFindingProposalToFinding('project-1', 'proposal-outside'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.researchFinding.create).not.toHaveBeenCalled();
  });

  it('creates evidence idempotently for a project source', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue({ projectId: 'project-1' });
    prisma.researchEvidence.upsert.mockResolvedValue({ id: 'evidence-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.createEvidence('project-1', {
      sourceId: 'source-1',
      sourceVersion: '  1st edition  ',
      locator: '  p. 42  ',
      quote: '  Los desastres de la guerra  ',
      context: '  Capítulo II  ',
      note: '  Relevante para atribución  ',
    });

    expect(prisma.researchEvidence.upsert).toHaveBeenCalledWith({
      where: {
        projectId_sourceId_fingerprint: {
          projectId: 'project-1',
          sourceId: 'source-1',
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: expect.objectContaining({
        projectId: 'project-1',
        sourceId: 'source-1',
        sourceVersion: '1st edition',
        locator: 'p. 42',
        quote: 'Los desastres de la guerra',
        context: 'Capítulo II',
        note: 'Relevante para atribución',
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      update: {
        sourceVersion: '1st edition',
        locator: 'p. 42',
        quote: 'Los desastres de la guerra',
        context: 'Capítulo II',
        note: 'Relevante para atribución',
      },
    });
  });

  it('rejects evidence for sources outside the project library', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue(null);

    await expect(
      service.createEvidence('project-1', {
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: 'p. 1',
        quote: 'Fragmento',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchEvidence.upsert).not.toHaveBeenCalled();
  });

  it('creates a proposed finding linked to project evidence', async () => {
    prisma.researchEvidence.findMany.mockResolvedValue([
      { id: 'evidence-1' },
      { id: 'evidence-2' },
    ]);
    tx.researchFinding.create.mockResolvedValue({ id: 'finding-1' });
    tx.researchFindingEvidence.createMany.mockResolvedValue({ count: 2 });
    tx.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.createFinding('project-1', {
      title: '  Una hipótesis  ',
      kind: '  attribution  ',
      summary: '  Depende de dos pasajes  ',
      evidenceIds: ['evidence-1', 'evidence-2', 'evidence-1'],
    });

    expect(tx.researchFinding.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Una hipótesis',
        kind: 'attribution',
        summary: 'Depende de dos pasajes',
      },
      select: { id: true },
    });
    expect(tx.researchFindingEvidence.createMany).toHaveBeenCalledWith({
      data: [
        { findingId: 'finding-1', evidenceId: 'evidence-1' },
        { findingId: 'finding-1', evidenceId: 'evidence-2' },
      ],
    });
  });

  it('rejects findings without project evidence', async () => {
    await expect(
      service.createFinding('project-1', { title: 'Hipótesis' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.researchEvidence.findMany.mockResolvedValue([{ id: 'evidence-1' }]);
    await expect(
      service.createFinding('project-1', {
        title: 'Hipótesis',
        evidenceIds: ['evidence-1', 'missing-evidence'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records a human decision and updates only research finding state', async () => {
    prisma.researchFinding.findFirst.mockResolvedValue({ id: 'finding-1' });
    tx.researchFinding.update.mockResolvedValue({ id: 'finding-1' });
    tx.researchDecision.create.mockResolvedValue({ id: 'decision-1' });
    tx.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.decideFinding('project-1', 'finding-1', 'user-1', {
      action: ResearchDecisionAction.INCORPORATE,
      note: '  Trabajar en borrador  ',
    });

    expect(prisma.researchFinding.findFirst).toHaveBeenCalledWith({
      where: { id: 'finding-1', projectId: 'project-1' },
      select: { id: true },
    });
    expect(tx.researchFinding.update).toHaveBeenCalledWith({
      where: { id: 'finding-1' },
      data: { status: ResearchFindingStatus.ACCEPTED },
    });
    expect(tx.researchDecision.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        findingId: 'finding-1',
        actorId: 'user-1',
        action: ResearchDecisionAction.INCORPORATE,
        note: 'Trabajar en borrador',
      },
    });
  });

  it('rejects decisions for findings outside the project', async () => {
    prisma.researchFinding.findFirst.mockResolvedValue(null);

    await expect(
      service.decideFinding('project-1', 'finding-1', 'user-1', {
        action: ResearchDecisionAction.REJECT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.researchDecision.create).not.toHaveBeenCalled();
  });
});
