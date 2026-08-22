import { BadRequestException } from '@nestjs/common';
import { EntityStatus } from '@prisma/client';
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
        findUnique: jest.fn().mockResolvedValue({ id: 'entity-1', status: EntityStatus.PUBLISHED }),
      },
      relationType: { findUnique: jest.fn().mockResolvedValue({ id: 'related-type' }) },
      relation: {
        create: jest.fn().mockResolvedValue({ id: relation.id }),
        findFirst: jest.fn(),
        update: jest.fn(),
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

  it('rejects publishing a relation when its target is not public', async () => {
    const { prisma, service } = createService();
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: 'entity-1', status: EntityStatus.PUBLISHED })
      .mockResolvedValueOnce({ id: 'entity-2', status: EntityStatus.DRAFT });

    await expect(
      service.createRelation('entity-1', {
        toId: 'entity-2',
        relationTypeId: 'related-type',
        status: 'PUBLISHED',
      }),
    ).rejects.toThrow(
      'Solo se puede publicar una relación cuando ambas entidades están publicadas.',
    );

    expect(prisma.relation.create).not.toHaveBeenCalled();
  });

  it('rejects publishing an existing relation when either endpoint is not public', async () => {
    const { prisma, service } = createService();
    prisma.relation.findFirst.mockResolvedValue({
      id: relation.id,
      status: 'DRAFT',
      relationType: { id: 'related-type' },
      from: { status: EntityStatus.PUBLISHED },
      to: { status: EntityStatus.IN_REVIEW },
    });

    await expect(
      service.updateRelation('entity-1', relation.id, { status: 'PUBLISHED' }),
    ).rejects.toThrow(
      'Solo se puede publicar una relación cuando ambas entidades están publicadas.',
    );

    expect(prisma.relation.update).not.toHaveBeenCalled();
  });

  it('allows either endpoint to add a justification to an existing relation', async () => {
    const { prisma, service } = createService();
    prisma.relation.findFirst.mockResolvedValue({
      id: relation.id,
      status: 'PUBLISHED',
      relationType: { id: 'related-type' },
      from: { status: EntityStatus.PUBLISHED },
      to: { status: EntityStatus.PUBLISHED },
    });

    await service.updateRelation('entity-2', relation.id, {
      justificationEs: 'Conexión editorial añadida después de publicar.',
    });

    expect(prisma.relation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: relation.id, OR: [{ fromId: 'entity-2' }, { toId: 'entity-2' }] },
      }),
    );
    expect(prisma.relation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          justification: 'Conexión editorial añadida después de publicar.',
        }),
      }),
    );
  });
});
