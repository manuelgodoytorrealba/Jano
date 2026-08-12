import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EntityReadService } from './entity-read.service';
import { EntityEditorialService } from './entity-editorial.service';

describe('EntityEditorialService', () => {
  it('creates a canonical draft record with its initial Spanish translation', async () => {
    const tx = { entity: { create: jest.fn().mockResolvedValue({ id: 'entity-1' }) } };
    const service = new EntityEditorialService({} as PrismaService, {} as EntityReadService);

    await service.createDraftRecord(tx as never, {
      type: 'ARTWORK',
      kind: 'WORK',
      title: ' Pinturas negras ',
      summary: ' Serie investigada. ',
    });

    expect(tx.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ARTWORK',
        kind: 'WORK',
        title: 'Pinturas negras',
        slug: expect.stringMatching(/^_draft-/),
        summary: 'Serie investigada.',
        status: 'DRAFT',
        translations: {
          create: {
            locale: 'es',
            title: 'Pinturas negras',
            shortDescription: 'Serie investigada.',
          },
        },
      }),
      select: { id: true },
    });
  });

  it('persists the Spanish translation, base entity and mentions in one transaction', async () => {
    const tx = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'entity-1', type: 'ARTICLE' }),
        update: jest.fn().mockResolvedValue({
          id: 'entity-1',
          content: 'Relacionada con [[moma]].',
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'entity-2' }]),
      },
      entityTranslation: { upsert: jest.fn().mockResolvedValue({}) },
      relation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      },
      relationType: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'mentions-type' }) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const readService = { adminGetById: jest.fn().mockResolvedValue({ id: 'entity-1' }) };
    const module = await Test.createTestingModule({
      providers: [
        EntityEditorialService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityReadService, useValue: readService },
      ],
    }).compile();

    await module.get(EntityEditorialService).upsertTranslation('entity-1', 'es', {
      title: 'Artículo',
      essay: 'Relacionada con [[moma]].',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.entityTranslation.upsert).toHaveBeenCalled();
    expect(tx.entity.update).toHaveBeenCalled();
    expect(tx.relation.create).toHaveBeenCalledWith({
      data: {
        fromId: 'entity-1',
        toId: 'entity-2',
        relationTypeId: 'mentions-type',
        status: 'PUBLISHED',
      },
    });
    expect(readService.adminGetById).toHaveBeenCalledWith('entity-1');
  });
});
