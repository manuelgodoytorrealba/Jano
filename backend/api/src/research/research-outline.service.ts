import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ResearchOutlineSectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchOutlineSectionDto } from './dto/create-research-outline-section.dto';
import { ReorderResearchOutlineSectionsDto } from './dto/reorder-research-outline-sections.dto';
import { ReorderResearchQuestionsDto } from './dto/reorder-research-questions.dto';
import { UpdateResearchOutlineSectionDto } from './dto/update-research-outline-section.dto';
import { CreateResearchQuestionDto } from './dto/create-research-question.dto';
import { UpdateResearchQuestionDto } from './dto/update-research-question.dto';
import { AddResearchOutlineSectionExcerptDto } from './dto/add-research-outline-section-excerpt.dto';

@Injectable()
export class ResearchOutlineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateResearchOutlineSectionDto) {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Research outline section title is required');

    const parentSectionId = dto.parentSectionId?.trim() || null;
    await this.requireProject(projectId);
    if (parentSectionId) await this.requireSection(projectId, parentSectionId);

    const lastSibling = await this.prisma.researchOutlineSection.aggregate({
      where: { projectId, parentSectionId },
      _max: { sortOrder: true },
    });

    return this.prisma.researchOutlineSection.create({
      data: {
        projectId,
        parentSectionId,
        title,
        sortOrder: (lastSibling._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async update(projectId: string, sectionId: string, dto: UpdateResearchOutlineSectionDto) {
    const section = await this.requireSection(projectId, sectionId);
    const title = dto.title?.trim();

    if (!title && !dto.status && dto.objective === undefined && dto.notes === undefined) {
      throw new BadRequestException('Research outline section update is required');
    }
    if (dto.title !== undefined && !title) {
      throw new BadRequestException('Research outline section title is required');
    }

    return this.prisma.researchOutlineSection.update({
      where: { id: section.id },
      data: {
        ...(title ? { title } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.objective !== undefined ? { objective: dto.objective.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
  }

  async reorder(projectId: string, dto: ReorderResearchOutlineSectionsDto) {
    const sectionIds = dto.sectionIds.map((id) => id.trim()).filter(Boolean);
    if (
      sectionIds.length !== dto.sectionIds.length ||
      new Set(sectionIds).size !== sectionIds.length
    ) {
      throw new BadRequestException(
        'Research outline section order must contain unique section ids',
      );
    }

    const parentSectionId = dto.parentSectionId?.trim() || null;
    await this.requireProject(projectId);
    if (parentSectionId) await this.requireSection(projectId, parentSectionId);

    const siblings = await this.prisma.researchOutlineSection.findMany({
      where: { projectId, parentSectionId },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    const siblingIds = new Set(siblings.map((section) => section.id));
    if (siblingIds.size !== sectionIds.length || sectionIds.some((id) => !siblingIds.has(id))) {
      throw new BadRequestException(
        'Research outline section order must contain every sibling exactly once',
      );
    }

    await this.prisma.$transaction(
      sectionIds.map((id, sortOrder) =>
        this.prisma.researchOutlineSection.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  }

  async createQuestion(projectId: string, sectionId: string, dto: CreateResearchQuestionDto) {
    await this.requireSection(projectId, sectionId);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Research question text is required');
    const last = await this.prisma.researchQuestion.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    return this.prisma.researchQuestion.create({
      data: { sectionId, text, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  }

  async updateQuestion(
    projectId: string,
    sectionId: string,
    questionId: string,
    dto: UpdateResearchQuestionDto,
  ) {
    await this.requireSection(projectId, sectionId);
    const question = await this.prisma.researchQuestion.findFirst({
      where: { id: questionId, sectionId },
    });
    const text = dto.text.trim();
    if (!question) throw new NotFoundException('Research question not found');
    if (!text) throw new BadRequestException('Research question text is required');
    return this.prisma.researchQuestion.update({ where: { id: question.id }, data: { text } });
  }

  async deleteQuestion(projectId: string, sectionId: string, questionId: string) {
    await this.requireSection(projectId, sectionId);
    const question = await this.prisma.researchQuestion.findFirst({
      where: { id: questionId, sectionId },
    });
    if (!question) throw new NotFoundException('Research question not found');
    await this.prisma.researchQuestion.delete({ where: { id: question.id } });
  }

  async reorderQuestions(projectId: string, sectionId: string, dto: ReorderResearchQuestionsDto) {
    await this.requireSection(projectId, sectionId);
    const questionIds = dto.questionIds.map((id) => id.trim()).filter(Boolean);
    if (
      questionIds.length !== dto.questionIds.length ||
      new Set(questionIds).size !== questionIds.length
    ) {
      throw new BadRequestException('Research question order must contain unique question ids');
    }
    const questions = await this.prisma.researchQuestion.findMany({
      where: { sectionId },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    const ids = new Set(questions.map((question) => question.id));
    if (ids.size !== questionIds.length || questionIds.some((id) => !ids.has(id))) {
      throw new BadRequestException(
        'Research question order must contain every question exactly once',
      );
    }
    await this.prisma.$transaction(
      questionIds.map((id, sortOrder) =>
        this.prisma.researchQuestion.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  }

  async addExcerpt(projectId: string, sectionId: string, dto: AddResearchOutlineSectionExcerptDto) {
    const libraryExcerptId = dto.libraryExcerptId.trim();
    if (!libraryExcerptId) throw new BadRequestException('Library excerpt is required');
    await this.requireSection(projectId, sectionId);
    const excerpt = await this.prisma.libraryExcerpt.findFirst({
      where: {
        id: libraryExcerptId,
        materialVersion: { material: { research: { some: { projectId } } } },
      },
      select: { id: true },
    });
    if (!excerpt) throw new NotFoundException('Library excerpt not found');
    const existing = await this.prisma.researchOutlineSectionExcerpt.findUnique({
      where: { sectionId_libraryExcerptId: { sectionId, libraryExcerptId } },
      select: { sectionId: true },
    });
    if (existing) return;
    const last = await this.prisma.researchOutlineSectionExcerpt.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    await this.prisma.researchOutlineSectionExcerpt.create({
      data: { sectionId, libraryExcerptId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  }

  async removeExcerpt(projectId: string, sectionId: string, libraryExcerptId: string) {
    await this.requireSection(projectId, sectionId);
    const reference = await this.prisma.researchOutlineSectionExcerpt.findUnique({
      where: { sectionId_libraryExcerptId: { sectionId, libraryExcerptId } },
      select: { sectionId: true },
    });
    if (!reference) throw new NotFoundException('Research outline section excerpt not found');
    await this.prisma.researchOutlineSectionExcerpt.delete({
      where: { sectionId_libraryExcerptId: { sectionId, libraryExcerptId } },
    });
  }

  private async requireProject(projectId: string) {
    const project = await this.prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
  }

  private async requireSection(projectId: string, sectionId: string) {
    const section = await this.prisma.researchOutlineSection.findFirst({
      where: { id: sectionId, projectId },
    });
    if (!section) throw new NotFoundException('Research outline section not found');
    return section;
  }
}
