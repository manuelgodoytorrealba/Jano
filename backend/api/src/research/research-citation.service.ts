import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LibraryMaterialKind, SourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CiteResearchItemDto } from './dto/cite-research-item.dto';

@Injectable()
export class ResearchCitationService {
  constructor(private readonly prisma: PrismaService) {}

  async citeResearchItem(projectId: string, dto: CiteResearchItemDto) {
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Research project not found');
      let sourceId = dto.sourceId;
      let data: { materialId?: string; libraryExcerptId?: string; evidenceId?: string } = {};
      if (dto.kind === 'material') {
        const material = await tx.libraryMaterial.findFirst({
          where: { id: dto.itemId, research: { some: { projectId } } },
          select: {
            id: true,
            sourceId: true,
            kind: true,
            title: true,
            versions: { orderBy: { version: 'desc' }, take: 1, select: { url: true } },
          },
        });
        if (!material) throw new NotFoundException('Research material not found');
        sourceId = sourceId ?? material.sourceId ?? undefined;
        if (!sourceId) {
          sourceId = (
            await tx.source.create({
              data: {
                type:
                  material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
                title: material.title,
                url: material.versions[0]?.url ?? null,
              },
              select: { id: true },
            })
          ).id;
          await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
        }
        data = { materialId: material.id };
      } else if (dto.kind === 'excerpt') {
        const excerpt = await tx.libraryExcerpt.findFirst({
          where: {
            id: dto.itemId,
            materialVersion: { material: { research: { some: { projectId } } } },
          },
          select: {
            id: true,
            materialVersion: {
              select: {
                material: {
                  select: {
                    id: true,
                    sourceId: true,
                    kind: true,
                    title: true,
                    versions: { orderBy: { version: 'desc' }, take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        });
        if (!excerpt) throw new NotFoundException('Research excerpt not found');
        sourceId = sourceId ?? excerpt.materialVersion.material.sourceId ?? undefined;
        if (!sourceId) {
          const material = excerpt.materialVersion.material;
          sourceId = (
            await tx.source.create({
              data: {
                type:
                  material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
                title: material.title,
                url: material.versions[0]?.url ?? null,
              },
              select: { id: true },
            })
          ).id;
          await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
        }
        data = { libraryExcerptId: excerpt.id };
      } else {
        const evidence = await tx.researchEvidence.findFirst({
          where: { id: dto.itemId, projectId },
          select: { id: true, sourceId: true },
        });
        if (!evidence) throw new NotFoundException('Research evidence not found');
        sourceId = sourceId ?? evidence.sourceId;
        data = { evidenceId: evidence.id };
      }
      if (!sourceId) throw new BadRequestException('The cited item has no source');
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId, sourceId } },
        create: { projectId, sourceId },
        update: {},
      });
      return tx.researchProjectCitation.create({ data: { projectId, sourceId, ...data } });
    });
    return;
  }

  async removeProjectCitation(projectId: string, citationId: string) {
    if (
      !(await this.prisma.researchProject.findUnique({
        where: { id: projectId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Research project not found');
    const { count } = await this.prisma.researchProjectCitation.deleteMany({
      where: { id: citationId, projectId },
    });
    if (!count) throw new NotFoundException('Research project citation not found');
    return;
  }

  async citeLibraryMaterial(projectId: string, materialId: string) {
    await this.prisma.$transaction(async (tx) => {
      const material = await tx.libraryMaterial.findFirst({
        where: { id: materialId, research: { some: { projectId } } },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });
      if (!material) throw new NotFoundException('Library material not found in this research');
      const sourceId =
        material.sourceId ??
        (
          await tx.source.create({
            data: {
              type:
                material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
              title: material.title,
              url: material.versions[0]?.url ?? null,
            },
            select: { id: true },
          })
        ).id;
      if (!material.sourceId)
        await tx.libraryMaterial.update({ where: { id: material.id }, data: { sourceId } });
      await tx.researchProjectSource.upsert({
        where: { projectId_sourceId: { projectId, sourceId } },
        create: { projectId, sourceId },
        update: {},
      });
    });
    return;
  }
}
