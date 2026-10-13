import { NotFoundException } from '@nestjs/common';
import { ResearchPublicationReadService } from './research-publication-read.service';

describe('ResearchPublicationReadService', () => {
  const prisma = {
    researchProject: { findFirst: jest.fn() },
    relation: { findMany: jest.fn() },
  };
  const service = new ResearchPublicationReadService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('does not expose a missing or unpublished project', async () => {
    prisma.researchProject.findFirst.mockResolvedValue(null);

    await expect(service.get('private-project')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'private-project', status: 'PUBLISHED' } }),
    );
  });

  it('presents an empty public graph without querying global relations', async () => {
    prisma.researchProject.findFirst.mockResolvedValue({
      id: 'published-project',
      title: 'Published project',
      objective: 'Explain the subject',
      scope: null,
      coverImageUrl: null,
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      outlineSections: [],
      sources: [],
      entities: [],
      relations: [],
      relatedProjects: [],
    });

    const result = await service.get('published-project');

    expect(result).toEqual(expect.objectContaining({ entities: [], relations: [], related: [] }));
    expect(prisma.relation.findMany).not.toHaveBeenCalled();
  });
});
