import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join, normalize, relative } from 'node:path';
import { LibraryMaterialKind, LibraryMaterialVersionStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLibraryMaterialDto } from './dto/create-library-material.dto';

type LibraryPdfFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMaterials() {
    const materials = await this.prisma.libraryMaterial.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        sourceId: true,
        kind: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            url: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
        research: {
          orderBy: { createdAt: 'desc' },
          select: { project: { select: { id: true, title: true } } },
        },
      },
    });

    return materials.map(({ versions, research, ...material }) => ({
      ...material,
      version: versions[0] ?? null,
      research: research.map(({ project }) => project),
    }));
  }

  async deleteMaterial(materialId: string) {
    const material = await this.prisma.libraryMaterial.findUnique({
      where: { id: materialId },
      select: {
        versions: {
          select: {
            storageKey: true,
            excerpts: {
              select: { _count: { select: { evidence: true, sectionReferences: true } } },
            },
          },
        },
      },
    });
    if (!material) throw new NotFoundException('Library material not found');
    if (
      material.versions.some((version) =>
        version.excerpts.some(
          (excerpt) => excerpt._count.evidence > 0 || excerpt._count.sectionReferences > 0,
        ),
      )
    ) {
      throw new ConflictException(
        'El material sostiene Evidence o una Section y no puede eliminarse de Biblioteca.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.researchLibraryMaterial.deleteMany({ where: { materialId } });
      await tx.libraryMaterial.delete({ where: { id: materialId } });
    });
    await Promise.all(
      material.versions
        .map((version) => version.storageKey)
        .filter((storageKey): storageKey is string => Boolean(storageKey))
        .map((storageKey) => this.deleteStoredFile(storageKey)),
    );
    return { deleted: true };
  }

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

  private async deleteStoredFile(storageKey: string) {
    const uploads = join(process.cwd(), 'uploads');
    const path = normalize(join(uploads, storageKey));
    if (relative(uploads, path).startsWith('..')) return;
    await unlink(path).catch(() => undefined);
  }
}
