import { Test, TestingModule } from '@nestjs/testing';
import { MediaOriginType, MediaRole } from '@prisma/client';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { EntitiesService } from './entities.service';
import { PrismaService } from '../prisma/prisma.service';
import { detectImageDimensionsFromBuffer } from './image-metadata';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('./image-metadata', () => ({
  detectImageDimensionsFromBuffer: jest.fn(),
}));

describe('EntitiesService media admin workflows', () => {
  let service: EntitiesService;
  const txMediaUpdate = jest.fn();
  const txEntityMediaUpdate = jest.fn();
  const txEntityMediaUpdateMany = jest.fn();

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
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.entity.findUnique.mockReset();
    prisma.media.create.mockReset();
    prisma.media.findUnique.mockReset();
    prisma.entityMedia.create.mockReset();
    prisma.entityMedia.findFirst.mockReset();
    prisma.entityMedia.findMany.mockReset();
    prisma.entityMedia.findUnique.mockReset();
    prisma.entityMedia.findUniqueOrThrow.mockReset();
    prisma.entityMedia.updateMany.mockReset();
    prisma.entityMedia.aggregate.mockReset();
    prisma.$transaction.mockReset();
    txMediaUpdate.mockReset();
    txEntityMediaUpdate.mockReset();
    txEntityMediaUpdateMany.mockReset();
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-1' });
    prisma.media.create.mockResolvedValue({ id: 'media-1' });
    prisma.media.findUnique.mockResolvedValue(null);
    prisma.entityMedia.create.mockResolvedValue({ id: 'link-1', media: { id: 'media-1' } });
    prisma.entityMedia.findFirst.mockResolvedValue(null);
    prisma.entityMedia.findMany.mockResolvedValue([]);
    prisma.entityMedia.findUnique.mockResolvedValue({ id: 'link-1', media: { id: 'media-1' } });
    prisma.entityMedia.findUniqueOrThrow.mockResolvedValue({ id: 'link-1', media: { id: 'media-1' } });
    prisma.entityMedia.updateMany.mockResolvedValue({ count: 0 });
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    txMediaUpdate.mockResolvedValue(undefined);
    txEntityMediaUpdate.mockResolvedValue(undefined);
    txEntityMediaUpdateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      media: {
        create: prisma.media.create,
        update: txMediaUpdate,
      },
      entityMedia: {
        create: prisma.entityMedia.create,
        update: txEntityMediaUpdate,
        updateMany: txEntityMediaUpdateMany,
        findUniqueOrThrow: prisma.entityMedia.findUniqueOrThrow,
      },
    }));

    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (readFile as jest.Mock).mockResolvedValue(Buffer.from([1, 2, 3]));
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (unlink as jest.Mock).mockResolvedValue(undefined);
    (detectImageDimensionsFromBuffer as jest.Mock).mockReturnValue({ width: 1200, height: 900 });
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
      data: expect.objectContaining({
        entityId: 'entity-1',
        mediaId: 'media-external-1',
        role: MediaRole.DETAIL,
        sortOrder: 3,
        isPrimary: true,
        displayMode: 'CONTAIN',
        focalX: 32.5,
        focalY: 61.2,
      }),
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
      path: '/tmp/uploaded-file.jpg',
    }, {
      alt: ' Obra subida ',
      source: '',
      photoBy: ' Equipo JANO ',
      license: ' Uso interno ',
      width: 10,
      height: 10,
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
      data: expect.objectContaining({
        entityId: 'entity-1',
        mediaId: 'media-upload-1',
        role: MediaRole.CARD,
        sortOrder: 2,
        isPrimary: false,
        displayMode: 'COVER',
        focalX: 44,
        focalY: 55,
      }),
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

  it('does not mark a new external media as fallback legacy unless explicitly requested', async () => {
    prisma.media.create.mockResolvedValue({
      id: 'media-external-plain',
      url: 'https://example.com/plain.jpg',
    });
    prisma.entityMedia.create.mockResolvedValue({
      id: 'link-external-plain',
      role: 'THUMBNAIL',
      sortOrder: 0,
      isPrimary: false,
      media: {
        id: 'media-external-plain',
        url: 'https://example.com/plain.jpg',
      },
    });

    await service.adminCreateMedia('entity-1', {
      url: 'https://example.com/plain.jpg',
      role: MediaRole.THUMBNAIL,
    });

    expect(prisma.entityMedia.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isPrimary: false,
      }),
    }));
    expect(txEntityMediaUpdateMany).not.toHaveBeenCalled();
  });

  it('keeps a single legacy fallback by disabling the previous one when a new one is created', async () => {
    prisma.media.create.mockResolvedValue({
      id: 'media-external-legacy',
      url: 'https://example.com/legacy-next.jpg',
    });
    prisma.entityMedia.create.mockResolvedValue({
      id: 'link-external-legacy',
      role: 'DETAIL',
      sortOrder: 0,
      isPrimary: true,
      media: {
        id: 'media-external-legacy',
        url: 'https://example.com/legacy-next.jpg',
      },
    });

    await service.adminCreateMedia('entity-1', {
      url: 'https://example.com/legacy-next.jpg',
      role: MediaRole.DETAIL,
      isPrimary: true,
    });

    expect(txEntityMediaUpdateMany).toHaveBeenCalledWith({
      where: {
        entityId: 'entity-1',
        id: { not: 'link-external-legacy' },
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  });

  it('ingests an external media link into a derived INGESTED gallery asset preserving lineage and visual metadata', async () => {
    prisma.entityMedia.findFirst
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce(null);
    prisma.entityMedia.aggregate.mockResolvedValue({ _max: { sortOrder: 6 } });
    (detectImageDimensionsFromBuffer as jest.Mock).mockReturnValue({ width: 1440, height: 960 });

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
        width: 1440,
        height: 960,
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
        updateMany: txEntityMediaUpdateMany,
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

  it('returns an existing derived ingested asset instead of ingesting twice', async () => {
    const existingLink = {
      id: 'link-ingested-existing',
      entityId: 'entity-1',
      mediaId: 'media-ingested-existing',
      role: MediaRole.GALLERY,
      sortOrder: 7,
      isPrimary: false,
      displayMode: 'CONTAIN',
      focalX: 21,
      focalY: 73,
      media: {
        id: 'media-ingested-existing',
        originType: MediaOriginType.INGESTED,
        derivedFromMediaId: 'media-external-1',
      },
    };

    prisma.entityMedia.findFirst
      .mockResolvedValueOnce({
        id: 'link-external-1',
        entityId: 'entity-1',
        mediaId: 'media-external-1',
        media: {
          id: 'media-external-1',
          originType: MediaOriginType.EXTERNAL_URL,
          url: 'https://images.example.com/source.jpg',
          displayUrl: null,
        },
      })
      .mockResolvedValueOnce(existingLink);

    const result = await service.adminIngestMedia('entity-1', 'link-external-1');

    expect(result).toEqual({
      ...existingLink,
      alreadyExisted: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
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
        updateMany: txEntityMediaUpdateMany,
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

  it('persists removing legacy fallback when isPrimary is saved as false', async () => {
    prisma.entityMedia.findFirst.mockResolvedValue({
      id: 'link-legacy-1',
      entityId: 'entity-1',
      mediaId: 'media-legacy-1',
      role: MediaRole.PRIMARY_LEGACY,
      sortOrder: 0,
      isPrimary: true,
      displayMode: 'COVER',
      focalX: null,
      focalY: null,
      media: {
        id: 'media-legacy-1',
        originType: MediaOriginType.EXTERNAL_URL,
        url: 'https://example.com/legacy.jpg',
        displayUrl: 'https://example.com/legacy.jpg',
      },
    });
    prisma.entityMedia.findUnique.mockResolvedValue({
      id: 'link-legacy-1',
      entityId: 'entity-1',
      mediaId: 'media-legacy-1',
      role: MediaRole.PRIMARY_LEGACY,
      sortOrder: 0,
      isPrimary: false,
      displayMode: 'COVER',
      focalX: null,
      focalY: null,
      media: {
        id: 'media-legacy-1',
        originType: MediaOriginType.EXTERNAL_URL,
      },
    } as any);

    await service.adminUpdateMedia('entity-1', 'link-legacy-1', {
      url: 'https://example.com/legacy.jpg',
      displayUrl: 'https://example.com/legacy.jpg',
      isPrimary: false,
    });

    expect(txEntityMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'link-legacy-1' },
      data: expect.objectContaining({
        isPrimary: false,
      }),
    });
  });

  it('returns canonical resolved slots in previewBySlug so contextual previews can choose preview, list or detail', async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      slug: 'guernica',
      title: 'Guernica',
      type: 'ARTWORK',
      summary: 'Resumen',
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
      startYear: 1937,
      endYear: null,
      mediaLinks: [
        {
          id: 'preview-link',
          role: MediaRole.THUMBNAIL,
          sortOrder: 0,
          isPrimary: false,
          displayMode: 'COVER',
          focalX: null,
          focalY: null,
          media: {
            id: 'preview-media',
            url: 'https://example.com/preview.jpg',
            displayUrl: 'https://example.com/preview.jpg',
            originType: MediaOriginType.EXTERNAL_URL,
            derivedFromMediaId: null,
            canonicalUrl: null,
            sourcePageUrl: null,
            storageKey: null,
            originalFilename: null,
            fileSize: null,
            mimeType: 'image/jpeg',
            width: 800,
            height: 800,
            isVector: false,
            provider: 'MUSEUM',
            qualityTier: 'HIGH',
            alt: 'Preview',
            source: null,
            photoBy: null,
            license: null,
          },
        },
      ],
    });

    const result = await service.previewBySlug('guernica');

    expect(result.mediaLibrary.resolvedSlots.find((slot: any) => slot.slotKey === 'preview')).toEqual(
      expect.objectContaining({
        source: 'explicit',
        matchedRole: 'THUMBNAIL',
        item: expect.objectContaining({
          id: 'preview-media',
        }),
      }),
    );
    expect(result.resolvedMedia.thumbnail).toEqual(
      expect.objectContaining({
        id: 'preview-media',
      }),
    );
  });

  it('normalizes legacy fallback to a single active media when adminGetById loads dirty data', async () => {
    prisma.entityMedia.findMany
      .mockResolvedValueOnce([
        { id: 'legacy-a' },
        { id: 'legacy-b' },
        { id: 'legacy-c' },
      ] as any)
      .mockResolvedValueOnce([]);
    prisma.entity.findUnique.mockResolvedValue({
      id: 'entity-1',
      type: 'ARTWORK',
      title: 'Entidad',
      slug: 'entidad',
      artwork: null,
      artist: null,
      concept: null,
      period: null,
      contributors: [],
      sourceRefs: [],
      outgoing: [],
      incoming: [],
      mediaLinks: [],
    });

    await service.adminGetById('entity-1');

    expect(prisma.entityMedia.updateMany).toHaveBeenCalledWith({
      where: {
        entityId: 'entity-1',
        id: {
          in: ['legacy-b', 'legacy-c'],
        },
      },
      data: {
        isPrimary: false,
      },
    });
  });
});
