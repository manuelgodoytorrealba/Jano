import { BadRequestException, ConflictException } from '@nestjs/common';
import { LibraryMaterialKind, LibraryMaterialVersionStatus } from '@prisma/client';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
  const tx = {
    libraryMaterial: { create: jest.fn(), delete: jest.fn() },
    libraryExcerpt: { upsert: jest.fn() },
    researchLibraryMaterial: { deleteMany: jest.fn() },
  };
  const prisma = {
    libraryMaterial: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const service = new LibraryService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
  });

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

  it('lists Library materials once and exposes their Research associations', async () => {
    prisma.libraryMaterial.findMany.mockResolvedValue([
      {
        id: 'material-1',
        sourceId: null,
        kind: LibraryMaterialKind.PDF,
        title: 'Catálogo',
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-02'),
        versions: [{ id: 'version-1', status: LibraryMaterialVersionStatus.READY }],
        research: [{ project: { id: 'research-1', title: 'Goya' } }],
      },
    ]);

    await expect(service.listMaterials()).resolves.toEqual([
      expect.objectContaining({
        id: 'material-1',
        version: expect.objectContaining({ id: 'version-1' }),
        research: [{ id: 'research-1', title: 'Goya' }],
      }),
    ]);
  });

  it('deletes an unused material and blocks deletion when it supports editorial work', async () => {
    prisma.libraryMaterial.findUnique.mockResolvedValueOnce({
      versions: [{ storageKey: null, excerpts: [] }],
    });

    await expect(service.deleteMaterial('material-1')).resolves.toEqual({ deleted: true });
    expect(tx.researchLibraryMaterial.deleteMany).toHaveBeenCalledWith({
      where: { materialId: 'material-1' },
    });
    expect(tx.libraryMaterial.delete).toHaveBeenCalledWith({ where: { id: 'material-1' } });

    prisma.libraryMaterial.findUnique.mockResolvedValueOnce({
      versions: [
        { storageKey: null, excerpts: [{ _count: { evidence: 1, sectionReferences: 0 } }] },
      ],
    });
    await expect(service.deleteMaterial('material-in-use')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
