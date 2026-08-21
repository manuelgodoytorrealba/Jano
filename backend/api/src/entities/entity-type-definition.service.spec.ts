import { BadRequestException } from '@nestjs/common';
import { EntityTypeStatus, KnowledgeEntityKind } from '@prisma/client';
import { EntityTypeDefinitionService } from './entity-type-definition.service';

describe('EntityTypeDefinitionService', () => {
  const definition = {
    key: 'MEME',
    singularName: 'Meme',
    pluralName: 'Memes',
    baseKind: KnowledgeEntityKind.ABSTRACTION,
    status: EntityTypeStatus.ACTIVE,
    systemType: false,
  };

  it('normalizes a custom key and rejects duplicate definitions', async () => {
    const prisma = {
      entityTypeDefinition: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(definition),
      },
    };
    const service = new EntityTypeDefinitionService(prisma as never);
    await expect(service.create({ ...definition, key: 'meme' })).resolves.toEqual(definition);
    expect(prisma.entityTypeDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ key: 'MEME' }),
    });
  });

  it('protects system types and types already in use from deletion', async () => {
    const prisma = {
      entityTypeDefinition: {
        findUnique: jest.fn().mockResolvedValue({ ...definition, _count: { entities: 1 } }),
      },
    };
    const service = new EntityTypeDefinitionService(prisma as never);
    await expect(service.remove('MEME')).rejects.toBeInstanceOf(BadRequestException);
    prisma.entityTypeDefinition.findUnique.mockResolvedValue({
      ...definition,
      systemType: true,
      _count: { entities: 0 },
    });
    await expect(service.remove('ARTWORK')).rejects.toBeInstanceOf(BadRequestException);
  });
});
