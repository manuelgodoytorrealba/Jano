import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchDraftService } from './research-draft.service';

describe('ResearchDraftService', () => {
  const tx = {
    researchDraft: { create: jest.fn(), update: jest.fn() },
    researchDraftRevision: { create: jest.fn() },
  };
  const prisma = {
    researchOutlineSection: { findFirst: jest.fn() },
    researchDraft: { findFirst: jest.fn() },
    $transaction: jest.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const service = new ResearchDraftService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (work) => work(tx));
  });

  it('creates an attributed first revision only inside the requested Section', async () => {
    prisma.researchOutlineSection.findFirst.mockResolvedValue({
      id: 'section-1',
      title: 'Hacia una nueva representación',
    });
    tx.researchDraft.create.mockResolvedValue({ id: 'draft-1' });
    tx.researchDraftRevision.create.mockResolvedValue({ id: 'revision-1' });
    tx.researchDraft.update.mockResolvedValue({ id: 'draft-1' });

    await service.create('research-1', 'section-1', 'user-1', { content: 'Primer texto.' });

    expect(prisma.researchOutlineSection.findFirst).toHaveBeenCalledWith({
      where: { id: 'section-1', projectId: 'research-1' },
      select: { id: true, title: true },
    });
    expect(tx.researchDraftRevision.create).toHaveBeenCalledWith({
      data: {
        draftId: 'draft-1',
        authorId: 'user-1',
        number: 1,
        content: 'Primer texto.',
      },
    });
    expect(tx.researchDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { currentRevisionId: 'revision-1' },
      include: { currentRevision: true },
    });
  });

  it('creates a new immutable revision and advances the explicit current revision', async () => {
    prisma.researchDraft.findFirst.mockResolvedValue({
      id: 'draft-1',
      currentRevision: { id: 'revision-1', number: 1, content: 'Anterior.' },
    });
    tx.researchDraftRevision.create.mockResolvedValue({ id: 'revision-2' });
    tx.researchDraft.update.mockResolvedValue({ id: 'draft-1' });

    await service.revise('research-1', 'draft-1', 'user-1', { content: 'Nueva revisión.' });

    expect(tx.researchDraftRevision.create).toHaveBeenCalledWith({
      data: {
        draftId: 'draft-1',
        authorId: 'user-1',
        number: 2,
        content: 'Nueva revisión.',
      },
    });
    expect(tx.researchDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { currentRevisionId: 'revision-2' },
      include: { currentRevision: true },
    });
  });

  it('rejects a Section from another Research', async () => {
    prisma.researchOutlineSection.findFirst.mockResolvedValue(null);

    await expect(
      service.create('research-1', 'section-2', 'user-1', { content: '' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
