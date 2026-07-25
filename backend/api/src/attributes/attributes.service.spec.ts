import { BadRequestException, ConflictException } from '@nestjs/common';
import { AttributesService } from './attributes.service';

describe('AttributesService', () => {
  it('rejects empty definition keys or labels', async () => {
    const prisma = { attributeDefinition: { create: jest.fn() } };
    const service = new AttributesService(prisma as never);

    await expect(
      service.createDefinition({ key: '   ', label: '  ', valueType: 'TEXT' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.attributeDefinition.create).not.toHaveBeenCalled();
  });

  it('persists only the value matching its definition', async () => {
    const prisma = {
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1' }) },
      attributeDefinition: {
        findUnique: jest.fn().mockResolvedValue({ id: 'definition-1', valueType: 'TEXT' }),
      },
      entityAttribute: { create: jest.fn().mockResolvedValue({ id: 'attribute-1' }) },
    };
    const service = new AttributesService(prisma as never);

    await service.createEntityAttribute('entity-1', {
      definitionId: 'definition-1',
      valueText: 'Florence',
    });

    expect(prisma.entityAttribute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ valueText: 'Florence', status: 'DRAFT' }),
      include: { definition: true, citations: { include: { source: true } } },
    });
  });

  it('rejects a value that does not match its definition', async () => {
    const prisma = {
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1' }) },
      attributeDefinition: {
        findUnique: jest.fn().mockResolvedValue({ id: 'definition-1', valueType: 'YEAR' }),
      },
      entityAttribute: { create: jest.fn() },
    };
    const service = new AttributesService(prisma as never);

    await expect(
      service.createEntityAttribute('entity-1', {
        definitionId: 'definition-1',
        valueText: 'Florence',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.entityAttribute.create).not.toHaveBeenCalled();
  });

  it('rejects a second published value for a single-value definition', async () => {
    const prisma = {
      entity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1' }) },
      attributeDefinition: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'definition-1',
          valueType: 'TEXT',
          isMultiple: false,
        }),
      },
      entityAttribute: {
        findFirst: jest.fn().mockResolvedValue({ id: 'attribute-existing' }),
        create: jest.fn(),
      },
    };
    const service = new AttributesService(prisma as never);

    await expect(
      service.createEntityAttribute('entity-1', {
        definitionId: 'definition-1',
        valueText: 'Florence',
        status: 'PUBLISHED',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.entityAttribute.create).not.toHaveBeenCalled();
  });

  it('promotes an existing attribute without changing its value', async () => {
    const prisma = {
      entityAttribute: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'attribute-1',
          entityId: 'entity-1',
          definitionId: 'definition-1',
          status: 'DRAFT',
          validFromYear: null,
          validToYear: null,
          definition: { valueType: 'TEXT', isMultiple: false },
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'attribute-1' }),
      },
    };
    const service = new AttributesService(prisma as never);

    await service.updateEntityAttribute('attribute-1', { status: 'PUBLISHED' });

    expect(prisma.entityAttribute.update).toHaveBeenCalledWith({
      where: { id: 'attribute-1' },
      data: expect.objectContaining({ status: 'PUBLISHED' }),
      include: { definition: true, citations: { include: { source: true } } },
    });
  });
});
