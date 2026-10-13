import { Injectable } from '@nestjs/common';
import { ResearchProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectStatusDto } from './dto/update-research-project-status.dto';

@Injectable()
export class ResearchProjectLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateResearchProjectDto) {
    return this.prisma.researchProject.create({
      data: {
        title: dto.title.trim(),
        ownerId,
        objective: dto.objective.trim(),
        scope: dto.scope?.trim() || null,
      },
    });
  }

  async listOwned(ownerId: string) {
    const projects = await this.prisma.researchProject.findMany({
      where: { ownerId },
      orderBy: [{ lastActiveAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: {
          select: {
            sources: true,
            evidence: true,
            claims: true,
            libraryMaterials: true,
          },
        },
      },
    });
    return projects.map(({ _count, ...project }) => ({
      ...project,
      _count: { ..._count, materials: _count.libraryMaterials },
    }));
  }

  listPublished() {
    return this.prisma.researchProject.findMany({
      where: { status: ResearchProjectStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        objective: true,
        scope: true,
        coverImageUrl: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  setCover(projectId: string, coverImageUrl: string | null) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: { coverImageUrl },
    });
  }

  touch(projectId: string) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: { lastActiveAt: new Date() },
    });
  }

  publish(projectId: string) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: {
        status: ResearchProjectStatus.PUBLISHED,
        publishedAt: new Date(),
        archivedAt: null,
        archivedById: null,
      },
    });
  }

  archive(projectId: string, actorId: string) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED', archivedAt: new Date(), archivedById: actorId },
    });
  }

  updateStatus(projectId: string, actorId: string, dto: UpdateResearchProjectStatusDto) {
    return this.prisma.researchProject.update({
      where: { id: projectId },
      data:
        dto.status === ResearchProjectStatus.ARCHIVED
          ? { status: dto.status, archivedAt: new Date(), archivedById: actorId }
          : { status: dto.status, archivedAt: null, archivedById: null },
    });
  }

  async delete(projectId: string) {
    await this.prisma.researchProject.delete({ where: { id: projectId } });
    return { deleted: true };
  }
}
