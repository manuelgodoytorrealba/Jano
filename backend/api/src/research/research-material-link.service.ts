import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResearchProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { AssociateResearchLibraryMaterialDto } from './dto/associate-research-library-material.dto';

@Injectable()
export class ResearchMaterialLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async addProjectSource(projectId: string, dto: AddResearchProjectSourceDto) {
    const [project, source] = await Promise.all([
      this.prisma.researchProject.findUnique({ where: { id: projectId }, select: { id: true } }),
      this.prisma.source.findUnique({ where: { id: dto.sourceId }, select: { id: true } }),
    ]);

    if (!project) throw new NotFoundException('Research project not found');
    if (!source) throw new NotFoundException('Source not found');

    const note = dto.note?.trim() || null;
    await this.prisma.researchProjectSource.upsert({
      where: { projectId_sourceId: { projectId, sourceId: dto.sourceId } },
      create: { projectId, sourceId: dto.sourceId, note },
      update: { note },
    });

    return;
  }

  async removeProjectSource(projectId: string, sourceId: string) {
    await this.requireProject(projectId);
    const { count } = await this.prisma.researchProjectSource.deleteMany({
      where: { projectId, sourceId },
    });
    if (!count) throw new NotFoundException('Research project source not found');
    return;
  }

  async addRelatedProject(projectId: string, relatedProjectId: string) {
    if (projectId === relatedProjectId)
      throw new BadRequestException('A research project cannot relate to itself');
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
    const relatedProject = await this.prisma.researchProject.findFirst({
      where: {
        id: relatedProjectId,
        ownerId: project.ownerId,
        status: ResearchProjectStatus.PUBLISHED,
      },
      select: { id: true },
    });
    if (!relatedProject) throw new NotFoundException('Related research project not found');
    await this.prisma.researchProjectRelation.upsert({
      where: { projectId_relatedProjectId: { projectId, relatedProjectId } },
      create: { projectId, relatedProjectId },
      update: {},
    });
    return;
  }

  async removeRelatedProject(projectId: string, relatedProjectId: string) {
    await this.requireProject(projectId);
    const { count } = await this.prisma.researchProjectRelation.deleteMany({
      where: { projectId, relatedProjectId },
    });
    if (!count) throw new NotFoundException('Related research project not found');
    return;
  }

  async associateLibraryMaterial(projectId: string, dto: AssociateResearchLibraryMaterialDto) {
    return this.prisma.$transaction(async (tx) => {
      const [project, material] = await Promise.all([
        tx.researchProject.findUnique({ where: { id: projectId }, select: { id: true } }),
        tx.libraryMaterial.findUnique({ where: { id: dto.materialId }, select: { id: true } }),
      ]);

      if (!project) throw new NotFoundException('Research project not found');
      if (!material) throw new NotFoundException('Library material not found');

      return tx.researchLibraryMaterial.upsert({
        where: { projectId_materialId: { projectId, materialId: dto.materialId } },
        create: { projectId, materialId: dto.materialId },
        update: {},
      });
    });
  }

  async removeLibraryMaterial(projectId: string, materialId: string) {
    await this.requireProject(projectId);
    const { count } = await this.prisma.researchLibraryMaterial.deleteMany({
      where: { projectId, materialId },
    });
    if (!count) throw new NotFoundException('Research material not found');
    return;
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
  }
}
