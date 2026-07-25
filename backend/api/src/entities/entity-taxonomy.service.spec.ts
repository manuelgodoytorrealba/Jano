import { BadRequestException } from '@nestjs/common';
import { EntityTaxonomyService } from './entity-taxonomy.service';

describe('EntityTaxonomyService relations', () => {
  const relation = {
    id: 'relation-1',
    relationType: { key: 'RELATED_TO', label: 'Relacionado con', directed: true, translations: [] },
    translations: [],
    to: { id: 'entity-2', title: 'Target', slug: 'target', type: 'ARTWORK' },
  };

  function createService() {
    const prisma = {
      entity: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'entity-1' })
          .mockResolvedValueOnce({ id: 'entity-2' }),
      },
      relationType: { findUnique: jest.fn().mockResolvedValue({ id: 'related-type' }) },
      relation: {
        create: jest.fn().mockResolvedValue({ id: relation.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(relation),
      },
      relationTranslation: { upsert: jest.fn().mockResolvedValue({}) },
    };
    return {
      prisma,
      service: new EntityTaxonomyService(prisma as never, {} as never),
    };
  }

  it('persists canonical assertion fields while preserving the legacy publish behaviour', async () => {
    const { prisma, service } = createService();

    await service.createRelation('entity-1', {
      toId: 'entity-2',
      relationTypeId: 'related-type',
      confidence: 0.8,
      validFromYear: 1920,
      validToYear: 1930,
    });

    expect(prisma.relation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PUBLISHED',
        confidence: 0.8,
        validFromYear: 1920,
        validToYear: 1930,
      }),
    });
  });

  it('rejects inverted validity ranges before persisting', async () => {
    const { prisma, service } = createService();

    await expect(
      service.createRelation('entity-1', {
        toId: 'entity-2',
        relationTypeId: 'related-type',
        validFromYear: 1930,
        validToYear: 1920,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.relation.create).not.toHaveBeenCalled();
  });
});
