import { BadRequestException } from '@nestjs/common';
import { LibraryMaterialKind, LibraryMaterialVersionStatus } from '@prisma/client';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
  const tx = {
    libraryMaterial: { create: jest.fn() },
    libraryExcerpt: { upsert: jest.fn() },
  };
  const service = new LibraryService();

  beforeEach(() => jest.resetAllMocks());

  it('creates TEXT and URL Materials with their first version', async () => {
    tx.libraryMaterial.create
      .mockResolvedValueOnce({ id: 'text-1' })
      .mockResolvedValueOnce({ id: 'url-1' });

    await service.createInitialMaterial(tx as never, {
      kind: LibraryMaterialKind.TEXT,
      title: '  Notas  ',
      content: '  Pasaje  ',
    });
    await service.createInitialMaterial(tx as never, {
      kind: LibraryMaterialKind.URL,
      title: '  Prado  ',
      url: 'https://www.museodelprado.es/',
    });

    expect(tx.libraryMaterial.create).toHaveBeenNthCalledWith(1, {
      data: {
        kind: LibraryMaterialKind.TEXT,
        title: 'Notas',
        versions: {
          create: {
            version: 1,
            status: LibraryMaterialVersionStatus.READY,
            content: 'Pasaje',
            url: null,
          },
        },
      },
      select: { id: true },
    });
    expect(tx.libraryMaterial.create).toHaveBeenNthCalledWith(2, {
      data: {
        kind: LibraryMaterialKind.URL,
        title: 'Prado',
        versions: {
          create: {
            version: 1,
            status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
            content: null,
            url: 'https://www.museodelprado.es/',
          },
        },
      },
      select: { id: true },
    });
  });

  it('rejects empty TEXT and URL values before writing', async () => {
    await expect(
      service.createInitialMaterial(tx as never, {
        kind: LibraryMaterialKind.TEXT,
        title: 'Notas',
        content: ' ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createInitialMaterial(tx as never, {
        kind: LibraryMaterialKind.URL,
        title: 'Prado',
        url: ' ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.libraryMaterial.create).not.toHaveBeenCalled();
  });
  it('creates a PDF Material with its physical representation metadata', async () => {
    tx.libraryMaterial.create.mockResolvedValue({ id: 'pdf-1' });

    await service.createInitialPdf(
      tx as never,
      {
        filename: 'private-id.pdf',
        originalname: 'Catálogo.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      },
      undefined,
    );

    expect(tx.libraryMaterial.create).toHaveBeenCalledWith({
      data: {
        kind: LibraryMaterialKind.PDF,
        title: 'Catálogo',
        versions: {
          create: {
            version: 1,
            status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
            storageKey: 'research/private-id.pdf',
            originalName: 'Catálogo.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
          },
        },
      },
      select: { id: true },
    });
  });

  it('creates a stable localizable excerpt without creating a Material', async () => {
    tx.libraryExcerpt.upsert.mockResolvedValue({ id: 'excerpt-1' });

    await service.createExcerpt(tx as never, 'version-1', ' page=4 ', ' Pasaje verificable ');

    expect(tx.libraryExcerpt.upsert).toHaveBeenCalledWith({
      where: {
        materialVersionId_fingerprint: {
          materialVersionId: 'version-1',
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: expect.objectContaining({
        materialVersionId: 'version-1',
        locator: 'page=4',
        text: 'Pasaje verificable',
      }),
      update: {},
    });
  });
});
