import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResearchJobStatus, ResearchJobType } from '@prisma/client';
import { LibraryMaterialPreparationService } from '../library/library-material-preparation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResearchAIService } from './research-ai.service';

type QueuedResearchJob = {
  id: string;
  projectId: string;
  sourceId: string | null;
  materialVersionId: string | null;
  type: ResearchJobType;
  attempts: number;
};

type RunNextResult =
  | { processed: false }
  | { processed: true; jobId: string; status: ResearchJobStatus };

@Injectable()
export class ResearchJobRunnerService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly researchAI: ResearchAIService,
    private readonly preparation: LibraryMaterialPreparationService,
  ) {}

  onModuleInit() {
    // ponytail: in-process worker; move to a dedicated worker when throughput requires it.
    setInterval(() => void this.runNextQueuedJob(), 1_000).unref();
  }

  async runNextQueuedJob(): Promise<RunNextResult> {
    const job = await this.prisma.researchJob.findFirst({
      where: { status: ResearchJobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        projectId: true,
        sourceId: true,
        materialVersionId: true,
        type: true,
        attempts: true,
      },
    });
    if (!job) return { processed: false };

    const claimed = await this.prisma.researchJob.updateMany({
      where: { id: job.id, status: ResearchJobStatus.QUEUED },
      data: {
        status: ResearchJobStatus.RUNNING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        finishedAt: null,
        lastError: null,
      },
    });
    if (!claimed.count) return { processed: false };

    const runningJob = { ...job, attempts: job.attempts + 1 };
    try {
      await this.runJobWork(runningJob);
      await this.prisma.researchJob.update({
        where: { id: job.id },
        data: { status: ResearchJobStatus.SUCCEEDED, finishedAt: new Date(), lastError: null },
      });
      return { processed: true, jobId: job.id, status: ResearchJobStatus.SUCCEEDED };
    } catch (error) {
      if (runningJob.materialVersionId)
        await this.preparation.markFailed(runningJob.materialVersionId);
      await this.prisma.researchJob.update({
        where: { id: job.id },
        data: {
          status: ResearchJobStatus.FAILED,
          lastError: error instanceof Error ? error.message : 'Research job failed',
          finishedAt: new Date(),
        },
      });
      return { processed: true, jobId: job.id, status: ResearchJobStatus.FAILED };
    }
  }

  private async runJobWork(job: QueuedResearchJob): Promise<void> {
    if (job.type === ResearchJobType.EXTRACT_FINDINGS) return this.researchAI.extractFindings(job);
    if (job.type === ResearchJobType.PREPARE_MATERIAL) {
      if (!job.materialVersionId) throw new Error('Research material version not found');
      return this.preparation.prepare(job.materialVersionId);
    }
    if (job.type !== ResearchJobType.PREPARE_SOURCE) {
      throw new Error(`Unsupported research job type: ${job.type}`);
    }
    if (!job.sourceId) throw new Error('Research job source not found');
    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId: job.projectId, sourceId: job.sourceId } },
      select: { sourceId: true },
    });
    if (!projectSource) throw new Error('Research project source not found');
  }
}
