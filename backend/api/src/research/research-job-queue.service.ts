import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchJobStatus, ResearchJobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  researchAnalysisContextFingerprint,
  researchJobFingerprint,
} from './research-fingerprints';

@Injectable()
export class ResearchJobQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async prepareSourceJob(projectId: string, sourceId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId, sourceId } },
      select: { sourceId: true },
    });
    if (!projectSource) throw new NotFoundException('Research project source not found');

    const type = ResearchJobType.PREPARE_SOURCE;
    const inputFingerprint = researchJobFingerprint({ projectId, sourceId, type });

    await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, sourceId, type, inputFingerprint },
      update: {},
    });

    return;
  }

  async extractProposalsJob(projectId: string, sourceId?: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');

    const sourceKey = sourceId?.trim() || null;
    if (sourceKey) {
      const projectSource = await this.prisma.researchProjectSource.findUnique({
        where: { projectId_sourceId: { projectId, sourceId: sourceKey } },
        select: { sourceId: true },
      });
      if (!projectSource) throw new NotFoundException('Research project source not found');
    }

    const type = ResearchJobType.EXTRACT_FINDINGS;
    const inputFingerprint = researchJobFingerprint({
      projectId,
      sourceId: sourceKey ?? undefined,
      contextFingerprint: sourceKey ? undefined : await this.analysisContextFingerprint(projectId),
      type,
    });

    await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, sourceId: sourceKey, type, inputFingerprint },
      update: {
        status: ResearchJobStatus.QUEUED,
        attempts: 0,
        progressCurrent: 0,
        progressTotal: 0,
        startedAt: null,
        finishedAt: null,
        lastError: null,
      },
    });

    return;
  }

  private async analysisContextFingerprint(projectId: string) {
    const [materials, sections] = await Promise.all([
      this.prisma.researchLibraryMaterial.findMany({
        where: { projectId },
        select: {
          material: {
            select: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { id: true, contentHash: true, status: true },
              },
            },
          },
        },
      }),
      this.prisma.researchOutlineSection.findMany({
        where: { projectId },
        select: {
          id: true,
          updatedAt: true,
          drafts: {
            where: { archivedAt: null },
            select: { updatedAt: true, currentRevisionId: true },
          },
        },
      }),
    ]);
    return researchAnalysisContextFingerprint({ materials, sections });
  }
}
