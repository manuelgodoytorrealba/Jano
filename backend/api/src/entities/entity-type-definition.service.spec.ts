import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityTypeStatus, KnowledgeEntityKind } from '@prisma/client';
import { EntityTypeDefinitionService } from './entity-type-definition.service';

import sharp from 'sharp';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('EntityTypeDefinitionService', () => {
  const definition = {
    key: 'MEME',
    singularName: 'Meme',
    pluralName: 'Memes',
    baseKind: KnowledgeEntityKind.ABSTRACTION,
    status: EntityTypeStatus.ACTIVE,
    systemType: false,
  };

  it('saves editorial fields without renaming the type or replacing an existing cover', async () => {
    const update = jest.fn().mockResolvedValue(definition);
    const prisma = {
      entityTypeDefinition: { findUnique: jest.fn().mockResolvedValue(definition) },
      $transaction: jest.fn(async (callback) => callback({ entityTypeDefinition: { update } })),
    };
    const service = new EntityTypeDefinitionService(prisma as never);
    await service.updateArchiveCard('MEME', {
      archiveTitleEs: ' Memes ',
      archiveTitleEn: '',
      archiveDescriptionEs: '',
      archiveDescriptionEn: 'Humour',
    });
    expect(update).toHaveBeenCalledWith({
      where: { key: 'MEME' },
      data: {
        archiveTitleEs: 'Memes',
        archiveTitleEn: null,
        archiveDescriptionEs: null,
        archiveDescriptionEn: 'Humour',
      },
    });
    prisma.entityTypeDefinition.findUnique.mockResolvedValue(null);
    await expect(service.updateArchiveCard('MISSING', {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates uploaded media and changes the cover in the same transaction', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'archive-cover-'));
    const path = join(directory, 'cover.png');
    try {
      await sharp({ create: { width: 20, height: 10, channels: 3, background: '#123456' } })
        .png()
        .toFile(path);
      const create = jest.fn().mockResolvedValue({ id: 'cover-media' });
      const update = jest.fn().mockResolvedValue(definition);
      const prisma = {
        entityTypeDefinition: { findUnique: jest.fn().mockResolvedValue(definition) },
        $transaction: jest.fn(async (callback) =>
          callback({ media: { create }, entityTypeDefinition: { update } }),
        ),
      };
      const service = new EntityTypeDefinitionService(prisma as never);
      await service.updateArchiveCard(
        'MEME',
        {
          archiveTitleEs: '',
          archiveTitleEn: '',
          archiveDescriptionEs: '',
          archiveDescriptionEn: '',
        },
        { path, filename: 'cover.png', originalname: 'mine.png', size: 100, mimetype: 'image/png' },
      );
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: '/uploads/media/cover.png',
          width: 20,
          height: 10,
          originType: 'UPLOAD',
        }),
      });
      expect(update).toHaveBeenCalledWith({
        where: { key: 'MEME' },
        data: expect.objectContaining({ homeCoverMediaId: 'cover-media', homeCoverMode: 'MANUAL' }),
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects files that cannot be decoded before creating media', async () => {
    const prisma = {
      entityTypeDefinition: { findUnique: jest.fn().mockResolvedValue(definition) },
      $transaction: jest.fn(),
    };
    const service = new EntityTypeDefinitionService(prisma as never);
    await expect(
      service.updateArchiveCard(
        'MEME',
        {} as never,
        { path: '/missing-invalid-file.png' } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

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
