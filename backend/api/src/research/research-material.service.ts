import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResearchJobStatus, ResearchJobType } from '@prisma/client';
import { LibraryService } from '../library/library.service';
import { CreateLibraryMaterialDto } from '../library/dto/create-library-material.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchPdfMaterialDto } from './dto/create-research-pdf-material.dto';
import type { UploadedResearchPdf } from './research-pdf-upload.config';
import { researchJobFingerprint } from './research-fingerprints';

@Injectable()
export class ResearchMaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly library: LibraryService,
  ) {}

  private async queueMaterialPreparation(projectId: string, materialId: string) {
    const version = await this.prisma.libraryMaterialVersion.findFirst({
      where: { materialId },
      orderBy: { version: 'desc' },
      select: { id: true, status: true },
    });
    if (!version || version.status !== 'PENDING_PREPARATION') return;
    const type = ResearchJobType.PREPARE_MATERIAL;
    const inputFingerprint = researchJobFingerprint({
      projectId,
      materialVersionId: version.id,
      type,
    });
    const job = await this.prisma.researchJob.upsert({
      where: { projectId_type_inputFingerprint: { projectId, type, inputFingerprint } },
      create: { projectId, materialVersionId: version.id, type, inputFingerprint },
      update: {},
      select: { id: true },
    });
    await this.prisma.researchJob.updateMany({
      where: { id: job.id, status: { not: ResearchJobStatus.RUNNING } },
      data: {
        status: ResearchJobStatus.QUEUED,
        startedAt: null,
        finishedAt: null,
        lastError: null,
      },
    });
  }

  async prepareMaterial(projectId: string, materialId: string) {
    const material = await this.prisma.libraryMaterial.findFirst({
      where: { id: materialId, research: { some: { projectId } } },
      select: {
        id: true,
        versions: { orderBy: { version: 'desc' }, take: 1, select: { id: true } },
      },
    });
    const version = material?.versions[0];
    if (!version) throw new NotFoundException('Research material not found');
    await this.prisma.libraryMaterialVersion.update({
      where: { id: version.id },
      data: { status: 'PENDING_PREPARATION' },
    });
    await this.queueMaterialPreparation(projectId, material.id);
    return;
  }

  async createMaterial(projectId: string, dto: CreateLibraryMaterialDto) {
    let materialId = '';
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');

      const material = await this.library.createInitialMaterial(tx, dto);
      materialId = material.id;
      await tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: material.id } },
        create: { projectId, materialId: material.id },
        update: {},
      });
    });
    await this.queueMaterialPreparation(projectId, materialId);

    return;
  }

  async createPdfMaterial(
    projectId: string,
    file: UploadedResearchPdf | undefined,
    dto: CreateResearchPdfMaterialDto,
  ) {
    if (!file) throw new BadRequestException('Research PDF is required');
    let materialId = '';
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');

      const material = await this.library.createInitialPdf(tx, file, dto.title, dto);
      materialId = material.id;
      await tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: material.id } },
        create: { projectId, materialId: material.id },
        update: {},
      });
    });
    await this.queueMaterialPreparation(projectId, materialId);

    return;
  }
}
