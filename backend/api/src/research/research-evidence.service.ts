import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LibraryMaterialKind,
  ResearchClaimKind,
  ResearchClaimStatus,
  SourceType,
} from '@prisma/client';
import { LibraryService } from '../library/library.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchClaimDto, SetResearchClaimStatusDto } from './dto/create-research-claim.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchEvidenceFromExcerptDto } from './dto/create-research-evidence-from-excerpt.dto';
import { CreateResearchLibraryExcerptDto } from './dto/create-research-library-excerpt.dto';
import { UpdateResearchEvidenceDto } from './dto/update-research-evidence.dto';
import { UpdateResearchLibraryExcerptDto } from './dto/update-research-library-excerpt.dto';
import { researchEvidenceFingerprint } from './research-fingerprints';

@Injectable()
export class ResearchEvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly library: LibraryService,
  ) {}

  async createClaim(projectId: string, dto: CreateResearchClaimDto) {
    await this.requireProject(projectId);
    const evidenceIds = [...new Set(dto.evidenceIds.map((id) => id.trim()).filter(Boolean))];
    if (!evidenceIds.length) throw new BadRequestException('Research claim evidence is required');

    const evidence = await this.prisma.researchEvidence.findMany({
      where: { projectId, id: { in: evidenceIds } },
      select: { id: true },
    });
    if (evidence.length !== evidenceIds.length) {
      throw new NotFoundException('Research evidence not found');
    }

    const isConnection = dto.kind === ResearchClaimKind.CONNECTION_HYPOTHESIS;
    const subjectClaimId = isConnection ? dto.subjectClaimId?.trim() : null;
    const objectClaimId = isConnection ? dto.objectClaimId?.trim() : null;
    if (isConnection && (!subjectClaimId || !objectClaimId || subjectClaimId === objectClaimId)) {
      throw new BadRequestException('A connection needs two different research claims');
    }

    if (isConnection) {
      const relatedClaims = await this.prisma.researchClaim.count({
        where: { projectId, id: { in: [subjectClaimId!, objectClaimId!] } },
      });
      if (relatedClaims !== 2) throw new NotFoundException('Related research claim not found');
    }

    await this.prisma.researchClaim.create({
      data: {
        projectId,
        kind: dto.kind,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        subjectClaimId,
        objectClaimId,
        status: ResearchClaimStatus.DRAFT,
        evidence: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) },
      },
    });

    return;
  }

  async setClaimStatus(projectId: string, claimId: string, dto: SetResearchClaimStatusDto) {
    const claim = await this.prisma.researchClaim.findFirst({
      where: { id: claimId, projectId },
      select: { id: true },
    });
    if (!claim) throw new NotFoundException('Research claim not found');

    await this.prisma.researchClaim.update({
      where: { id: claimId },
      data: { status: dto.status },
    });
    return;
  }

  async createEvidence(projectId: string, dto: CreateResearchEvidenceDto) {
    const projectSource = await this.prisma.researchProjectSource.findUnique({
      where: { projectId_sourceId: { projectId, sourceId: dto.sourceId } },
      select: { projectId: true },
    });
    if (!projectSource) throw new NotFoundException('Research project source not found');

    const libraryExcerptId = dto.libraryExcerptId?.trim();
    if (libraryExcerptId) {
      const excerpt = await this.prisma.libraryExcerpt.findFirst({
        where: {
          id: libraryExcerptId,
          materialVersion: { material: { research: { some: { projectId } } } },
        },
        select: { id: true },
      });
      if (!excerpt) throw new NotFoundException('Library excerpt not found');
    }

    const data = {
      sourceVersion: dto.sourceVersion.trim(),
      locator: dto.locator.trim(),
      quote: dto.quote?.trim() || null,
      context: dto.context?.trim() || null,
      note: dto.note?.trim() || null,
      ...(libraryExcerptId ? { libraryExcerptId } : {}),
    };
    const fingerprint = researchEvidenceFingerprint({ sourceId: dto.sourceId, ...data });

    await this.prisma.researchEvidence.upsert({
      where: { projectId_sourceId_fingerprint: { projectId, sourceId: dto.sourceId, fingerprint } },
      create: { projectId, sourceId: dto.sourceId, fingerprint, ...data },
      update: data,
    });

    return;
  }

  async createLibraryExcerpt(projectId: string, dto: CreateResearchLibraryExcerptDto) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.libraryMaterialVersion.findFirst({
        where: {
          id: dto.materialVersionId,
          material: { research: { some: { projectId } } },
        },
        select: { id: true },
      });
      if (!version) throw new NotFoundException('Library material version not found');
      return this.library.createExcerpt(tx, version.id, dto.locator, dto.text);
    });
  }

  async createEvidenceFromExcerpt(
    projectId: string,
    excerptId: string,
    dto: CreateResearchEvidenceFromExcerptDto = {},
  ) {
    await this.prisma.$transaction(async (tx) => {
      const excerpt = await tx.libraryExcerpt.findFirst({
        where: {
          id: excerptId,
          materialVersion: { material: { research: { some: { projectId } } } },
        },
        include: { materialVersion: { include: { material: true } } },
      });
      if (!excerpt) throw new NotFoundException('Library excerpt not found');

      const material = excerpt.materialVersion.material;
      const sourceId =
        material.sourceId ??
        (
          await tx.source.create({
            data: {
              type:
                material.kind === LibraryMaterialKind.URL ? SourceType.WEBSITE : SourceType.PAPER,
              title: material.title,
              url: excerpt.materialVersion.url,
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

      const sourceVersion = `material-v${excerpt.materialVersion.version}`;
      const fingerprint = researchEvidenceFingerprint({
        sourceId,
        sourceVersion,
        locator: excerpt.locator,
        quote: null,
        context: null,
        note: null,
        libraryExcerptId: excerpt.id,
      });
      await tx.researchEvidence.upsert({
        where: { projectId_sourceId_fingerprint: { projectId, sourceId, fingerprint } },
        create: {
          projectId,
          sourceId,
          libraryExcerptId: excerpt.id,
          sourceVersion,
          locator: excerpt.locator,
          quote: null,
          context: dto.context?.trim() || null,
          note: dto.note?.trim() || null,
          fingerprint,
        },
        update: {},
      });
    });
    return;
  }

  async deleteEvidence(projectId: string, evidenceId: string) {
    const { count } = await this.prisma.researchEvidence.deleteMany({
      where: { id: evidenceId, projectId },
    });
    if (!count) throw new NotFoundException('Research evidence not found');
    return;
  }

  async updateEvidence(projectId: string, evidenceId: string, dto: UpdateResearchEvidenceDto) {
    const { count } = await this.prisma.researchEvidence.updateMany({
      where: { id: evidenceId, projectId },
      data: { context: dto.context?.trim() || null, note: dto.note?.trim() || null },
    });
    if (!count) throw new NotFoundException('Research evidence not found');
    return;
  }

  async deleteLibraryExcerpt(projectId: string, excerptId: string) {
    const excerpt = await this.prisma.libraryExcerpt.findFirst({
      where: {
        id: excerptId,
        materialVersion: { material: { research: { some: { projectId } } } },
      },
      select: { id: true, _count: { select: { evidence: true, sectionReferences: true } } },
    });
    if (!excerpt) throw new NotFoundException('Library excerpt not found');
    if (excerpt._count.evidence || excerpt._count.sectionReferences) {
      throw new BadRequestException(
        'Remove the Evidence and Section references before deleting this excerpt',
      );
    }
    await this.prisma.libraryExcerpt.delete({ where: { id: excerpt.id } });
    return;
  }

  async updateLibraryExcerpt(
    projectId: string,
    excerptId: string,
    dto: UpdateResearchLibraryExcerptDto,
  ) {
    const excerpt = await this.prisma.libraryExcerpt.findFirst({
      where: {
        id: excerptId,
        materialVersion: { material: { research: { some: { projectId } } } },
      },
      select: { id: true },
    });
    if (!excerpt) throw new NotFoundException('Library excerpt not found');
    await this.prisma.libraryExcerpt.update({
      where: { id: excerpt.id },
      data: { locator: dto.locator.trim(), text: dto.text.trim() },
    });
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
