import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EntityReadService } from './entity-read.service';
import { EntityEditorialService } from './entity-editorial.service';

describe('EntityEditorialService draft creation', () => {
  it('creates a Draft with server-owned provisional identity', async () => {
    const tx = {
      entity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'draft-1', content: null }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      relation: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), delete: jest.fn() },
      relationType: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'mentions-type' }) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const readService = { adminGetById: jest.fn().mockResolvedValue({ id: 'draft-1' }) };
    const module = await Test.createTestingModule({
      providers: [
        EntityEditorialService,
        { provide: PrismaService, useValue: prisma },
        { provide: EntityReadService, useValue: readService },
      ],
    }).compile();

    await module.get(EntityEditorialService).createDraft({ type: 'ARTIST' });

    expect(tx.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ARTIST',
        title: 'Sin título',
        slug: expect.stringMatching(/^_draft-/),
        status: 'DRAFT',
      }),
    });
    expect(readService.adminGetById).toHaveBeenCalledWith('draft-1');
  });
});
