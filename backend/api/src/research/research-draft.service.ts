import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateResearchDraftDto,
  CreateResearchDraftRevisionDto,
} from './dto/create-research-draft.dto';

@Injectable()
export class ResearchDraftService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, sectionId: string, dto: CreateResearchDraftDto) {
    const section = await this.prisma.researchOutlineSection.findFirst({
      where: { id: sectionId, projectId },
      select: { id: true, title: true },
    });
    if (!section) throw new NotFoundException('Research section not found');

    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.researchDraft.create({
        data: {
          projectId,
          sectionId,
          title: dto.title?.trim() || section.title,
          workingContent: dto.content ?? '',
        },
      });
      return tx.researchDraft.findUniqueOrThrow({
        where: { id: draft.id },
        include: { currentRevision: true },
      });
    });
  }

  async saveWorkingCopy(projectId: string, draftId: string, content: string) {
    const draft = await this.prisma.researchDraft.findFirst({
      where: { id: draftId, projectId, archivedAt: null },
      select: { id: true },
    });
    if (!draft) throw new NotFoundException('Research draft not found');
    return this.prisma.researchDraft.update({
      where: { id: draftId },
      data: { workingContent: content },
      include: { currentRevision: true },
    });
  }

  async revise(
    projectId: string,
    draftId: string,
    authorId: string,
    dto: CreateResearchDraftRevisionDto,
  ) {
    const draft = await this.prisma.researchDraft.findFirst({
      where: { id: draftId, projectId, archivedAt: null },
      include: { currentRevision: true },
    });
    if (!draft) throw new NotFoundException('Research draft not found');
    if (draft.currentRevision?.content === dto.content) {
      return this.prisma.researchDraft.update({
        where: { id: draftId },
        data: { workingContent: dto.content },
        include: { currentRevision: true },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const revision = await tx.researchDraftRevision.create({
        data: {
          draftId,
          authorId,
          number: (draft.currentRevision?.number ?? 0) + 1,
          content: dto.content,
        },
      });
      return tx.researchDraft.update({
        where: { id: draftId },
        data: { currentRevisionId: revision.id, workingContent: dto.content },
        include: { currentRevision: true },
      });
    });
  }
}
