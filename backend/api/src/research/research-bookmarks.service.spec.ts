import { NotFoundException } from '@nestjs/common';
import { ResearchBookmarksService } from './research-bookmarks.service';
import { PrismaService } from '../prisma/prisma.service';

function setup() {
  const prisma = {
    researchProject: { findFirst: jest.fn().mockResolvedValue({ id: 'published' }) },
    collection: { findFirst: jest.fn().mockResolvedValue({ id: 'owned' }) },
    savedResearchPublication: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    collectionResearchPublication: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
  return { prisma, service: new ResearchBookmarksService(prisma as unknown as PrismaService) };
}

describe('public publication bookmarks', () => {
  it('only lists still-published research and selects public metadata, never private knowledge', async () => {
    const { service, prisma } = setup();
    await service.list('reader');
    const query = prisma.savedResearchPublication.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ userId: 'reader', research: { status: 'PUBLISHED' } });
    expect(Object.keys(query.select.research.select).sort()).toEqual([
      'coverImageUrl',
      'id',
      'objective',
      'publishedAt',
      'title',
    ]);
  });
  it('rejects private or missing publications before saving or checking them', async () => {
    const { service, prisma } = setup();
    prisma.researchProject.findFirst.mockResolvedValue(null);
    await expect(service.save('reader', 'private')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.check('reader', 'private')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.savedResearchPublication.upsert).not.toHaveBeenCalled();
    expect(prisma.savedResearchPublication.findUnique).not.toHaveBeenCalled();
  });
  it('saves idempotently for the authenticated reader and removes only that reader’s reference', async () => {
    const { service, prisma } = setup();
    await service.save('reader', 'published');
    expect(prisma.savedResearchPublication.upsert).toHaveBeenCalledWith({
      where: { userId_researchId: { userId: 'reader', researchId: 'published' } },
      create: { userId: 'reader', researchId: 'published' },
      update: {},
    });
    await service.remove('reader', 'published');
    expect(prisma.savedResearchPublication.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'reader', researchId: 'published' },
    });
  });
  it('checks collection ownership for both adding and removing, with no cross-user writes', async () => {
    const { service, prisma } = setup();
    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(service.addToCollection('reader', 'foreign', 'published')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.removeFromCollection('reader', 'foreign', 'published'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.collection.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', userId: 'reader' },
      select: { id: true },
    });
    expect(prisma.collectionResearchPublication.upsert).not.toHaveBeenCalled();
    expect(prisma.collectionResearchPublication.deleteMany).not.toHaveBeenCalled();
  });
  it('rejects private research even when the reader owns the collection', async () => {
    const { service, prisma } = setup();
    prisma.researchProject.findFirst.mockResolvedValue(null);
    await expect(service.addToCollection('reader', 'owned', 'private')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collectionResearchPublication.upsert).not.toHaveBeenCalled();
  });
});
