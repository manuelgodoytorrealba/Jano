import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResearchOutlineSectionDto } from './dto/create-research-outline-section.dto';
import { ReorderResearchOutlineSectionsDto } from './dto/reorder-research-outline-sections.dto';
import { ReorderResearchQuestionsDto } from './dto/reorder-research-questions.dto';
import { UpdateResearchOutlineSectionDto } from './dto/update-research-outline-section.dto';
import { CreateResearchQuestionDto } from './dto/create-research-question.dto';
import { UpdateResearchQuestionDto } from './dto/update-research-question.dto';
import { AddResearchOutlineSectionExcerptDto } from './dto/add-research-outline-section-excerpt.dto';
import { AddResearchOutlineSectionMaterialDto } from './dto/add-research-outline-section-material.dto';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';

type UploadedSectionImage = {
  filename: string;
  mimetype: string;
};

@Injectable()
export class ResearchOutlineService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

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

  async setImage(projectId: string, sectionId: string, file: UploadedSectionImage | undefined) {
    const section = await this.requireSection(projectId, sectionId);
    if (!file?.mimetype.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten imágenes válidas');
    }

    return this.prisma.researchOutlineSection.update({
      where: { id: section.id },
      data: { imageUrl: buildPublicUploadUrl(`media/${file.filename}`, this.mediaPublicBaseUrl) },
    });
  }

  async clearImage(projectId: string, sectionId: string) {
    const section = await this.requireSection(projectId, sectionId);
    return this.prisma.researchOutlineSection.update({
      where: { id: section.id },
      data: { imageUrl: null },
    });
  }

  async delete(projectId: string, sectionId: string) {
    const section = await this.requireSection(projectId, sectionId);
    return this.prisma.researchOutlineSection.delete({ where: { id: section.id } });
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

  async addMaterial(
    projectId: string,
    sectionId: string,
    dto: AddResearchOutlineSectionMaterialDto,
  ) {
    const materialVersionId = dto.materialVersionId.trim();
    await this.requireSection(projectId, sectionId);
    const version = await this.prisma.libraryMaterialVersion.findFirst({
      where: { id: materialVersionId, material: { research: { some: { projectId } } } },
      select: { id: true },
    });
    if (!version) throw new NotFoundException('Library material version not found');
    const existing = await this.prisma.researchOutlineSectionMaterial.findUnique({
      where: { sectionId_materialVersionId: { sectionId, materialVersionId } },
      select: { sectionId: true },
    });
    if (existing) return;
    const last = await this.prisma.researchOutlineSectionMaterial.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    await this.prisma.researchOutlineSectionMaterial.create({
      data: { sectionId, materialVersionId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  }

  async removeMaterial(projectId: string, sectionId: string, materialVersionId: string) {
    await this.requireSection(projectId, sectionId);
    const reference = await this.prisma.researchOutlineSectionMaterial.findUnique({
      where: { sectionId_materialVersionId: { sectionId, materialVersionId } },
      select: { sectionId: true },
    });
    if (!reference) throw new NotFoundException('Research outline section material not found');
    await this.prisma.researchOutlineSectionMaterial.delete({
      where: { sectionId_materialVersionId: { sectionId, materialVersionId } },
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
