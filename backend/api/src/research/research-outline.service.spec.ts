import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchOutlineService } from './research-outline.service';

describe('ResearchOutlineService workspace', () => {
  const prisma = {
    researchProject: { findUnique: jest.fn() },
    researchOutlineSection: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    researchOutlineSectionExcerpt: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    researchOutlineSectionMaterial: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    libraryMaterialVersion: { findFirst: jest.fn() },
    libraryExcerpt: { findFirst: jest.fn() },
    researchQuestion: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: ResearchOutlineService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.researchOutlineSection.findFirst.mockResolvedValue({
      id: 'section-1',
      projectId: 'project-1',
    });
    service = new ResearchOutlineService(prisma as unknown as PrismaService);
  });

  it('persists the section objective and private notes without creating canonical knowledge', async () => {
    prisma.researchOutlineSection.update.mockResolvedValue({ id: 'section-1' });

    await service.update('project-1', 'section-1', {
      objective: ' Explicar la ruptura de Cézanne ',
      notes: ' Contrastar con Braque ',
    });

    expect(prisma.researchOutlineSection.update).toHaveBeenCalledWith({
      where: { id: 'section-1' },
      data: { objective: 'Explicar la ruptura de Cézanne', notes: 'Contrastar con Braque' },
    });
  });

  it('stores an uploaded editorial image on the section', async () => {
    prisma.researchOutlineSection.update.mockResolvedValue({ id: 'section-1' });

    await service.setImage('project-1', 'section-1', {
      filename: 'section-cover.webp',
      mimetype: 'image/webp',
    });

    expect(prisma.researchOutlineSection.update).toHaveBeenCalledWith({
      where: { id: 'section-1' },
      data: { imageUrl: '/uploads/media/section-cover.webp' },
    });
  });

  it('deletes only a section belonging to the research', async () => {
    prisma.researchOutlineSection.delete.mockResolvedValue({ id: 'section-1' });

    await service.delete('project-1', 'section-1');

    expect(prisma.researchOutlineSection.findFirst).toHaveBeenCalledWith({
      where: { id: 'section-1', projectId: 'project-1' },
    });
    expect(prisma.researchOutlineSection.delete).toHaveBeenCalledWith({
      where: { id: 'section-1' },
    });
  });

  it('creates, edits and removes questions owned by one section', async () => {
    prisma.researchQuestion.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prisma.researchQuestion.create.mockResolvedValue({ id: 'question-1' });
    prisma.researchQuestion.findFirst.mockResolvedValue({
      id: 'question-1',
      sectionId: 'section-1',
    });

    await service.createQuestion('project-1', 'section-1', { text: ' ¿Qué cambia? ' });
    await service.updateQuestion('project-1', 'section-1', 'question-1', {
      text: ' ¿Qué se transforma? ',
    });
    await service.deleteQuestion('project-1', 'section-1', 'question-1');

    expect(prisma.researchQuestion.create).toHaveBeenCalledWith({
      data: { sectionId: 'section-1', text: '¿Qué cambia?', sortOrder: 3 },
    });
    expect(prisma.researchQuestion.update).toHaveBeenCalledWith({
      where: { id: 'question-1' },
      data: { text: '¿Qué se transforma?' },
    });
    expect(prisma.researchQuestion.delete).toHaveBeenCalledWith({ where: { id: 'question-1' } });
  });

  it('adds an accessible excerpt once with a stable section order', async () => {
    prisma.libraryExcerpt.findFirst.mockResolvedValue({ id: 'excerpt-1' });
    prisma.researchOutlineSectionExcerpt.findUnique.mockResolvedValue(null);
    prisma.researchOutlineSectionExcerpt.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });

    await service.addExcerpt('project-1', 'section-1', { libraryExcerptId: ' excerpt-1 ' });

    expect(prisma.researchOutlineSectionExcerpt.create).toHaveBeenCalledWith({
      data: { sectionId: 'section-1', libraryExcerptId: 'excerpt-1', sortOrder: 3 },
    });
  });

  it('does not duplicate an excerpt already anchored to the section', async () => {
    prisma.libraryExcerpt.findFirst.mockResolvedValue({ id: 'excerpt-1' });
    prisma.researchOutlineSectionExcerpt.findUnique.mockResolvedValue({ sectionId: 'section-1' });

    await service.addExcerpt('project-1', 'section-1', { libraryExcerptId: 'excerpt-1' });

    expect(prisma.researchOutlineSectionExcerpt.create).not.toHaveBeenCalled();
  });

  it('anchors an accessible Library material version once to the Section', async () => {
    prisma.libraryMaterialVersion.findFirst.mockResolvedValue({ id: 'version-1' });
    prisma.researchOutlineSectionMaterial.findUnique.mockResolvedValue(null);
    prisma.researchOutlineSectionMaterial.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } });

    await service.addMaterial('project-1', 'section-1', { materialVersionId: ' version-1 ' });

    expect(prisma.libraryMaterialVersion.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'version-1',
        material: { research: { some: { projectId: 'project-1' } } },
      },
      select: { id: true },
    });
    expect(prisma.researchOutlineSectionMaterial.create).toHaveBeenCalledWith({
      data: { sectionId: 'section-1', materialVersionId: 'version-1', sortOrder: 2 },
    });
  });

  it('reorders exactly the questions belonging to the active section', async () => {
    prisma.researchQuestion.findMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
    prisma.$transaction.mockResolvedValue([]);

    await service.reorderQuestions('project-1', 'section-1', { questionIds: ['q2', 'q1'] });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.researchQuestion.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'q2' },
      data: { sortOrder: 0 },
    });
    expect(prisma.researchQuestion.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'q1' },
      data: { sortOrder: 1 },
    });
  });

  it('rejects a reordered list that loses a question', async () => {
    prisma.researchQuestion.findMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);

    await expect(
      service.reorderQuestions('project-1', 'section-1', { questionIds: ['q1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
