import { Test, TestingModule } from '@nestjs/testing';
import { MediaOriginType, MediaRole } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { EntitiesService } from './entities.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

describe('EntitiesService media admin workflows', () => {
  let service: EntitiesService;

  const prisma = {
    entity: {
      findUnique: jest.fn(),
    },
    media: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    entityMedia: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-1' });
    prisma.media.create.mockResolvedValue({ id: 'media-1' });
    prisma.media.findUnique.mockResolvedValue(null);
    prisma.entityMedia.create.mockResolvedValue({ id: 'link-1', media: { id: 'media-1' } });
    prisma.entityMedia.findFirst.mockResolvedValue(null);
    prisma.entityMedia.findMany.mockResolvedValue([]);
    prisma.entityMedia.findUniqueOrThrow.mockResolvedValue({ id: 'link-1', media: { id: 'media-1' } });
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      media: {
        create: prisma.media.create,
      },
      entityMedia: {
        create: prisma.entityMedia.create,
        update: jest.fn(),
        findUniqueOrThrow: prisma.entityMedia.findUniqueOrThrow,
      },
    }));

    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (unlink as jest.Mock).mockResolvedValue(undefined);
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EntitiesService);
  });

  it('creates external media links with trimmed metadata and preserves visual metadata', async () => {
    prisma.media.create.mockResolvedValue({
      id: 'media-external-1',
      url: 'https://example.com/art.jpg',
    });
    prisma.entityMedia.create.mockResolvedValue({
      id: 'link-external-1',
      role: 'DETAIL',
      sortOrder: 3,
      isPrimary: true,
      displayMode: 'CONTAIN',
      focalX: 32.5,
      focalY: 61.2,
      media: {
        id: 'media-external-1',
        url: 'https://example.com/art.jpg',
      },
    });

    const result = await service.adminCreateMedia('entity-1', {
      url: ' https://example.com/art.jpg ',
      displayUrl: ' https://images.example.com/render.jpg ',
      sourcePageUrl: ' https://museum.example.com/work ',
      alt: ' Alt limpio ',
      source: ' Museo de prueba ',
      photoBy: ' Fotografa ',
      license: ' CC BY ',
      role: MediaRole.DETAIL,
      sortOrder: 3,
      isPrimary: true,
      displayMode: 'CONTAIN',
      focalX: 32.5,
      focalY: 61.2,
    });

    expect(prisma.media.create).toHaveBeenCalledWith({
      data: {
        url: 'https://example.com/art.jpg',
        originType: MediaOriginType.EXTERNAL_URL,
        displayUrl: 'https://images.example.com/render.jpg',
        sourcePageUrl: 'https://museum.example.com/work',
        alt: 'Alt limpio',
        source: 'Museo de prueba',
        photoBy: 'Fotografa',
        license: 'CC BY',
      },
    });

    expect(prisma.entityMedia.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        mediaId: 'media-external-1',
        role: MediaRole.DETAIL,
        sortOrder: 3,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 32.5,
        focalY: 61.2,
      },
      include: {
        media: true,
      },
    });

    expect(result).toEqual(expect.objectContaining({
      id: 'link-external-1',
      role: 'DETAIL',
      sortOrder: 3,
      isPrimary: true,
      displayMode: 'CONTAIN',
      focalX: 32.5,
      focalY: 61.2,
    }));
  });

  it('creates uploaded media with canonical/display public urls and preserves visual metadata', async () => {
    prisma.media.create.mockResolvedValue({
      id: 'media-upload-1',
      url: 'http://localhost:3000/uploads/media/uploaded-file.jpg',
    });
    prisma.entityMedia.create.mockResolvedValue({
      id: 'link-upload-1',
      role: 'CARD',
      sortOrder: 2,
      isPrimary: false,
      displayMode: 'COVER',
      focalX: 44,
      focalY: 55,
      media: {
        id: 'media-upload-1',
        originType: 'UPLOAD',
      },
    });

    const result = await service.adminUploadMedia('entity-1', {
      filename: 'uploaded-file.jpg',
      originalname: 'original-file.jpg',
      mimetype: 'image/jpeg',
      size: 123456,
    }, {
      alt: ' Obra subida ',
      source: '',
      photoBy: ' Equipo JANO ',
      license: ' Uso interno ',
      width: 1200,
      height: 900,
      role: MediaRole.CARD,
      sortOrder: 2,
      isPrimary: false,
      displayMode: 'COVER',
      focalX: 44,
      focalY: 55,
    });

    expect(prisma.media.create).toHaveBeenCalledWith({
      data: {
        url: 'http://localhost:3000/uploads/media/uploaded-file.jpg',
        canonicalUrl: 'http://localhost:3000/uploads/media/uploaded-file.jpg',
        displayUrl: 'http://localhost:3000/uploads/media/uploaded-file.jpg',
        originType: MediaOriginType.UPLOAD,
        storageKey: 'media/uploaded-file.jpg',
        originalFilename: 'original-file.jpg',
        fileSize: 123456,
        mimeType: 'image/jpeg',
        width: 1200,
        height: 900,
        alt: 'Obra subida',
        source: 'Uploaded via admin',
        photoBy: 'Equipo JANO',
        license: 'Uso interno',
      },
    });

    expect(prisma.entityMedia.create).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        mediaId: 'media-upload-1',
        role: MediaRole.CARD,
        sortOrder: 2,
        isPrimary: false,
        displayMode: 'COVER',
        focalX: 44,
        focalY: 55,
      },
      include: {
        media: true,
      },
    });

    expect(result).toEqual(expect.objectContaining({
      id: 'link-upload-1',
      role: 'CARD',
      sortOrder: 2,
      displayMode: 'COVER',
    }));
  });

  it('ingests an external media link into a derived INGESTED gallery asset preserving lineage and visual metadata', async () => {
    prisma.entityMedia.findFirst.mockResolvedValue({
      id: 'link-external-1',
      entityId: 'entity-1',
      mediaId: 'media-external-1',
      role: MediaRole.DETAIL,
      sortOrder: 4,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 21,
      focalY: 73,
      media: {
        id: 'media-external-1',
        originType: MediaOriginType.EXTERNAL_URL,
        url: 'https://images.example.com/source.jpg',
        displayUrl: null,
        canonicalUrl: 'https://museum.example.com/work/source',
        sourcePageUrl: 'https://museum.example.com/work',
        width: 1200,
        height: 900,
        provider: 'MUSEUM',
        qualityTier: 'HIGH',
        alt: 'Detalle original',
        source: 'Museum source',
        photoBy: 'Photo credit',
        license: 'CC BY',
      },
    });
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 6 } });

    const transactionMediaCreate = jest.fn().mockResolvedValue({ id: 'media-ingested-1' });
    const transactionEntityMediaCreate = jest.fn().mockResolvedValue({
      id: 'link-ingested-1',
      role: MediaRole.GALLERY,
      sortOrder: 7,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 21,
      focalY: 73,
      media: {
        id: 'media-ingested-1',
        originType: MediaOriginType.INGESTED,
        derivedFromMediaId: 'media-external-1',
      },
    });
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<unknown>) => callback({
      media: { create: transactionMediaCreate },
      entityMedia: { create: transactionEntityMediaCreate },
    }));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === 'content-type' ? 'image/jpeg' : null },
      arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    const result = await service.adminIngestMedia('entity-1', 'link-external-1');

    expect(global.fetch).toHaveBeenCalledWith('https://images.example.com/source.jpg');
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('/uploads/media/ingested'), { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('/uploads/media/ingested/'),
      expect.any(Buffer),
    );

    expect(transactionMediaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        originType: MediaOriginType.INGESTED,
        canonicalUrl: 'https://museum.example.com/work/source',
        sourcePageUrl: 'https://museum.example.com/work',
        derivedFromMediaId: 'media-external-1',
        width: 1200,
        height: 900,
        provider: 'MUSEUM',
        qualityTier: 'HIGH',
        alt: 'Detalle original',
        source: 'Museum source',
        photoBy: 'Photo credit',
        license: 'CC BY',
        displayUrl: expect.stringMatching(/^http:\/\/localhost:3000\/uploads\/media\/ingested\/.+\.jpg$/),
        url: expect.stringMatching(/^http:\/\/localhost:3000\/uploads\/media\/ingested\/.+\.jpg$/),
        storageKey: expect.stringMatching(/^media\/ingested\/.+\.jpg$/),
      }),
    });

    expect(transactionEntityMediaCreate).toHaveBeenCalledWith({
      data: {
        entityId: 'entity-1',
        mediaId: 'media-ingested-1',
        role: MediaRole.GALLERY,
        sortOrder: 7,
        isPrimary: false,
        displayMode: 'CONTAIN',
        focalX: 21,
        focalY: 73,
      },
      include: {
        media: true,
      },
    });

    expect(result).toEqual(expect.objectContaining({
      id: 'link-ingested-1',
      role: MediaRole.GALLERY,
      sortOrder: 7,
      displayMode: 'CONTAIN',
      focalX: 21,
      focalY: 73,
    }));
  });

  it('promotes an ingested asset as the active visual replacement and degrades the external source to gallery', async () => {
    prisma.entityMedia.findFirst.mockResolvedValue({
      id: 'link-ingested-1',
      entityId: 'entity-1',
      mediaId: 'media-ingested-1',
      role: MediaRole.GALLERY,
      sortOrder: 8,
      isPrimary: false,
      displayMode: null,
      focalX: null,
      focalY: null,
      media: {
        id: 'media-ingested-1',
        originType: MediaOriginType.INGESTED,
        canonicalUrl: 'https://museum.example.com/work/source',
      },
    });
    prisma.media.findUnique.mockResolvedValue({
      derivedFromMediaId: 'media-external-1',
    });
    prisma.entityMedia.findMany.mockResolvedValue([
      {
        id: 'link-external-1',
        entityId: 'entity-1',
        mediaId: 'media-external-1',
        role: MediaRole.HERO,
        sortOrder: 0,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 34,
        focalY: 66,
        media: {
          id: 'media-external-1',
          originType: MediaOriginType.EXTERNAL_URL,
          canonicalUrl: 'https://museum.example.com/work/source',
          displayUrl: 'https://images.example.com/source.jpg',
          url: 'https://images.example.com/source.jpg',
        },
      },
    ]);
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });

    const txUpdate = jest.fn().mockResolvedValue(undefined);
    const promotedLink = {
      id: 'link-ingested-1',
      role: MediaRole.HERO,
      sortOrder: 0,
      isPrimary: true,
      displayMode: 'CONTAIN',
      focalX: 34,
      focalY: 66,
      media: {
        id: 'media-ingested-1',
        originType: MediaOriginType.INGESTED,
      },
    };
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<unknown>) => callback({
      entityMedia: {
        update: txUpdate,
        findUniqueOrThrow: jest.fn().mockResolvedValue(promotedLink),
      },
    }));
    prisma.entityMedia.findUniqueOrThrow.mockResolvedValue({
      id: 'link-external-1',
      role: MediaRole.GALLERY,
      sortOrder: 6,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 34,
      focalY: 66,
      media: {
        id: 'media-external-1',
        originType: MediaOriginType.EXTERNAL_URL,
      },
    });

    const result = await service.adminPromoteIngestedMedia('entity-1', 'link-ingested-1');

    expect(txUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'link-ingested-1' },
      data: {
        role: MediaRole.HERO,
        sortOrder: 0,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 34,
        focalY: 66,
      },
    });

    expect(txUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'link-external-1' },
      data: {
        role: MediaRole.GALLERY,
        sortOrder: 6,
        isPrimary: false,
      },
    });

    expect(result).toEqual({
      promotedLink,
      sourceLink: expect.objectContaining({
        id: 'link-external-1',
        role: MediaRole.GALLERY,
        sortOrder: 6,
        isPrimary: false,
      }),
    });
  });

  it('restores the external asset as the main visual and demotes the promoted ingested asset back to gallery', async () => {
    prisma.entityMedia.findFirst.mockResolvedValue({
      id: 'link-external-1',
      entityId: 'entity-1',
      mediaId: 'media-external-1',
      role: MediaRole.GALLERY,
      sortOrder: 6,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 34,
      focalY: 66,
      media: {
        id: 'media-external-1',
        originType: MediaOriginType.EXTERNAL_URL,
        canonicalUrl: 'https://museum.example.com/work/source',
        displayUrl: 'https://images.example.com/source.jpg',
        url: 'https://images.example.com/source.jpg',
      },
    });
    prisma.entityMedia.findMany.mockResolvedValue([
      {
        id: 'link-ingested-1',
        entityId: 'entity-1',
        mediaId: 'media-ingested-1',
        role: MediaRole.HERO,
        sortOrder: 0,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 34,
        focalY: 66,
        media: {
          id: 'media-ingested-1',
          originType: MediaOriginType.INGESTED,
          derivedFromMediaId: 'media-external-1',
        },
      },
    ]);
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });

    const txUpdate = jest.fn().mockResolvedValue(undefined);
    const restoredLink = {
      id: 'link-external-1',
      role: MediaRole.HERO,
      sortOrder: 0,
      isPrimary: true,
      displayMode: 'CONTAIN',
      focalX: 34,
      focalY: 66,
      media: {
        id: 'media-external-1',
        originType: MediaOriginType.EXTERNAL_URL,
      },
    };
    prisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<unknown>) => callback({
      entityMedia: {
        update: txUpdate,
        findUniqueOrThrow: jest.fn().mockResolvedValue(restoredLink),
      },
    }));
    prisma.entityMedia.findUniqueOrThrow.mockResolvedValue({
      id: 'link-ingested-1',
      role: MediaRole.GALLERY,
      sortOrder: 5,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 34,
      focalY: 66,
      media: {
        id: 'media-ingested-1',
        originType: MediaOriginType.INGESTED,
        derivedFromMediaId: 'media-external-1',
      },
    });

    const result = await service.adminRestoreExternalMedia('entity-1', 'link-external-1');

    expect(txUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'link-external-1' },
      data: {
        role: MediaRole.HERO,
        sortOrder: 0,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 34,
        focalY: 66,
      },
    });

    expect(txUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'link-ingested-1' },
      data: {
        role: MediaRole.GALLERY,
        sortOrder: 5,
        isPrimary: false,
      },
    });

    expect(result).toEqual({
      restoredLink,
      ingestedLink: expect.objectContaining({
        id: 'link-ingested-1',
        role: MediaRole.GALLERY,
        sortOrder: 5,
        isPrimary: false,
      }),
    });
  });
});
