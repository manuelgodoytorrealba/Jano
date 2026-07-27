import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchOutlineService } from './research-outline.service';

describe('ResearchOutlineService workspace', () => {
  const prisma = {
    researchProject: { findUnique: jest.fn() },
    researchOutlineSection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
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
