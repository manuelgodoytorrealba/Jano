import { CitationsService } from './citations.service';

describe('CitationsService', () => {
  it('attaches a citation to exactly the requested assertion', async () => {
    const prisma = {
      source: { findUnique: jest.fn().mockResolvedValue({ id: 'source-1' }) },
      relation: { findUnique: jest.fn().mockResolvedValue({ id: 'relation-1' }) },
      citation: { create: jest.fn().mockResolvedValue({ id: 'citation-1' }) },
    };
    const service = new CitationsService(prisma as never);

    await service.create('relation', 'relation-1', {
      sourceId: 'source-1',
      stance: 'SUPPORTS',
    });

    expect(prisma.citation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceId: 'source-1',
        relationId: 'relation-1',
        stance: 'SUPPORTS',
      }),
      include: { source: true, translations: true },
    });
  });

  it('updates a citation without changing its assertion target', async () => {
    const prisma = {
      citation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'citation-1' }),
        update: jest.fn().mockResolvedValue({ id: 'citation-1' }),
      },
    };
    const service = new CitationsService(prisma as never);

    await service.update('citation-1', { stance: 'CONTRADICTS', note: 'Counterexample' });

    expect(prisma.citation.update).toHaveBeenCalledWith({
      where: { id: 'citation-1' },
      data: expect.objectContaining({ stance: 'CONTRADICTS', note: 'Counterexample' }),
      include: { source: true, translations: true },
    });
  });
  it('keeps a research evidence link only when it belongs to the citation source', async () => {
    const prisma = {
      source: { findUnique: jest.fn().mockResolvedValue({ id: 'source-1' }) },
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1' }) },
      researchEvidence: { findUnique: jest.fn().mockResolvedValue({ sourceId: 'source-1' }) },
      citation: { create: jest.fn().mockResolvedValue({ id: 'citation-1' }) },
    };
    const service = new CitationsService(prisma as never);

    await service.create('entity', 'entity-1', {
      sourceId: 'source-1',
      researchEvidenceId: 'evidence-1',
    });

    expect(prisma.citation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ researchEvidenceId: 'evidence-1' }),
      include: { source: true, translations: true },
    });
  });
});
