import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchJobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  researchAnalysisContextFingerprint,
  researchJobFingerprint,
} from './research-fingerprints';

@Injectable()
export class ResearchGenerationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');

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
    const contextFingerprint = researchAnalysisContextFingerprint({ materials, sections });
    const inputFingerprint = researchJobFingerprint({
      projectId,
      type: ResearchJobType.EXTRACT_FINDINGS,
      contextFingerprint,
    });
    const [job, preparedMaterials] = await Promise.all([
      this.prisma.researchJob.findFirst({
        where: { projectId, type: ResearchJobType.EXTRACT_FINDINGS },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { findingProposals: true } } },
      }),
      this.prisma.libraryMaterialVersion.count({
        where: {
          status: 'READY',
          content: { not: null },
          material: { research: { some: { projectId } } },
        },
      }),
    ]);
    return {
      job,
      stale: Boolean(job && job.inputFingerprint !== inputFingerprint),
      canGenerate: preparedMaterials > 0,
      preparedMaterials,
    };
  }
}
