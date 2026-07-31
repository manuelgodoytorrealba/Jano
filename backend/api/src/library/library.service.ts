import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { LibraryMaterialKind, LibraryMaterialVersionStatus, type Prisma } from '@prisma/client';
import { CreateLibraryMaterialDto } from './dto/create-library-material.dto';

type LibraryPdfFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class LibraryService {
  async createInitialMaterial(tx: Prisma.TransactionClient, dto: CreateLibraryMaterialDto) {
    const content = dto.kind === LibraryMaterialKind.TEXT ? dto.content?.trim() : null;
    const url = dto.kind === LibraryMaterialKind.URL ? dto.url?.trim() : null;
    if (dto.kind === LibraryMaterialKind.TEXT && !content) {
      throw new BadRequestException('Library text content is required');
    }
    if (dto.kind === LibraryMaterialKind.URL && !url) {
      throw new BadRequestException('Library material URL is required');
    }

    return tx.libraryMaterial.create({
      data: {
        kind: dto.kind,
        title: dto.title.trim(),
        versions: {
          create: {
            version: 1,
            status:
              dto.kind === LibraryMaterialKind.TEXT
                ? LibraryMaterialVersionStatus.READY
                : LibraryMaterialVersionStatus.PENDING_PREPARATION,
            content,
            url,
          },
        },
      },
      select: { id: true },
    });
  }

  async createInitialPdf(tx: Prisma.TransactionClient, file: LibraryPdfFile, title?: string) {
    return tx.libraryMaterial.create({
      data: {
        kind: LibraryMaterialKind.PDF,
        title: title?.trim() || file.originalname.replace(/\.pdf$/i, ''),
        versions: {
          create: {
            version: 1,
            status: LibraryMaterialVersionStatus.PENDING_PREPARATION,
            storageKey: `research/${file.filename}`,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        },
      },
      select: { id: true },
    });
  }

  createExcerpt(
    tx: Prisma.TransactionClient,
    materialVersionId: string,
    locator: string,
    text: string,
  ) {
    const normalizedLocator = locator.trim();
    const normalizedText = text.trim();
    if (!normalizedLocator || !normalizedText) {
      throw new BadRequestException('Excerpt locator and text are required');
    }
    const fingerprint = createHash('sha256')
      .update([normalizedLocator, normalizedText].join('\u001f'))
      .digest('hex');

    return tx.libraryExcerpt.upsert({
      where: { materialVersionId_fingerprint: { materialVersionId, fingerprint } },
      create: { materialVersionId, locator: normalizedLocator, text: normalizedText, fingerprint },
      update: {},
    });
  }
}
