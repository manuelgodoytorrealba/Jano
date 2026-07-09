import { ResearchJobStatus, ResearchJobType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchJobRunnerService } from './research-job-runner.service';

describe('ResearchJobRunnerService', () => {
  const prisma = {
    researchJob: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    researchProjectSource: {
      findUnique: jest.fn(),
    },
  };
  let service: ResearchJobRunnerService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ResearchJobRunnerService(prisma as unknown as PrismaService);
  });

  it('runs the next queued source preparation job to success', async () => {
    prisma.researchJob.findFirst.mockResolvedValue({
      id: 'job-1',
      projectId: 'project-1',
      sourceId: 'source-1',
      type: ResearchJobType.PREPARE_SOURCE,
      attempts: 0,
    });
    prisma.researchJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.researchProjectSource.findUnique.mockResolvedValue({ sourceId: 'source-1' });
    prisma.researchJob.update.mockResolvedValue({ id: 'job-1' });

    await expect(service.runNextQueuedJob()).resolves.toEqual({
      processed: true,
      jobId: 'job-1',
      status: ResearchJobStatus.SUCCEEDED,
    });

    expect(prisma.researchJob.findFirst).toHaveBeenCalledWith({
      where: { status: ResearchJobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        projectId: true,
        sourceId: true,
        type: true,
        attempts: true,
      },
    });
    expect(prisma.researchJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: ResearchJobStatus.QUEUED },
      data: {
        status: ResearchJobStatus.RUNNING,
        attempts: { increment: 1 },
        startedAt: expect.any(Date),
        finishedAt: null,
        lastError: null,
      },
    });
    expect(prisma.researchJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: {
        status: ResearchJobStatus.SUCCEEDED,
        finishedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('marks a job without a valid source as failed', async () => {
    prisma.researchJob.findFirst.mockResolvedValue({
      id: 'job-1',
      projectId: 'project-1',
      sourceId: 'source-1',
      type: ResearchJobType.PREPARE_SOURCE,
      attempts: 1,
    });
    prisma.researchJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.researchProjectSource.findUnique.mockResolvedValue(null);
    prisma.researchJob.update.mockResolvedValue({ id: 'job-1' });

    await expect(service.runNextQueuedJob()).resolves.toEqual({
      processed: true,
      jobId: 'job-1',
      status: ResearchJobStatus.FAILED,
    });

    expect(prisma.researchJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attempts: { increment: 1 } }) }),
    );
    expect(prisma.researchJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job-1' },
      data: {
        status: ResearchJobStatus.FAILED,
        lastError: 'Research project source not found',
        finishedAt: expect.any(Date),
      },
    });
  });

  it('returns processed false when no queued job can be claimed', async () => {
    prisma.researchJob.findFirst.mockResolvedValueOnce(null);

    await expect(service.runNextQueuedJob()).resolves.toEqual({ processed: false });
    expect(prisma.researchJob.updateMany).not.toHaveBeenCalled();

    prisma.researchJob.findFirst.mockResolvedValueOnce({
      id: 'job-1',
      projectId: 'project-1',
      sourceId: 'source-1',
      type: ResearchJobType.PREPARE_SOURCE,
      attempts: 0,
    });
    prisma.researchJob.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.runNextQueuedJob()).resolves.toEqual({ processed: false });
  });
});
