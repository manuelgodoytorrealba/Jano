import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaOriginType, MediaRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { EntityMediaService } from './entity-media.service';
import { detectImageDimensionsFromBuffer } from './image-metadata';

const MAX_INGEST_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_INGEST_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

@Injectable()
export class EntityMediaLifecycleService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: EntityMediaService,
  ) {}

  private buildPublicUploadUrl(storageKey: string): string {
    return buildPublicUploadUrl(storageKey, this.mediaPublicBaseUrl);
  }
  private normalizeMimeType(value: string | null | undefined): string | null {
    return value?.split(';')[0]?.trim().toLowerCase() ?? null;
  }

  private normalizeUrlCandidate(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.replace(/\/+$/, '');
  }

  private mediaSourceCandidates(media: {
    url?: string | null;
    displayUrl?: string | null;
    canonicalUrl?: string | null;
  }): string[] {
    return Array.from(
      new Set(
        [
          this.normalizeUrlCandidate(media.canonicalUrl),
          this.normalizeUrlCandidate(media.displayUrl),
          this.normalizeUrlCandidate(media.url),
        ].filter((value): value is string => !!value),
      ),
    );
  }

  private async findSourceExternalLinkForIngested(
    entityId: string,
    linkId: string,
    ingestedMediaId: string,
    canonicalUrl: string | null | undefined,
  ) {
    const ingestedMedia = await this.prisma.media.findUnique({
      where: { id: ingestedMediaId },
      select: {
        derivedFromMediaId: true,
      },
    });

    const candidates = await this.prisma.entityMedia.findMany({
      where: {
        entityId,
        id: {
          not: linkId,
        },
        media: {
          originType: MediaOriginType.EXTERNAL_URL,
        },
      },
      include: {
        media: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (ingestedMedia?.derivedFromMediaId) {
      const direct = candidates.find(
        (candidate) => candidate.mediaId === ingestedMedia.derivedFromMediaId,
      );
      if (direct) {
        return direct;
      }
    }

    const normalizedCanonical = this.normalizeUrlCandidate(canonicalUrl);
    if (!normalizedCanonical) {
      throw new BadRequestException(
        'El asset INGESTED no conserva referencia suficiente al asset externo',
      );
    }

    const match = candidates.find((candidate) =>
      this.mediaSourceCandidates(candidate.media).includes(normalizedCanonical),
    );

    if (!match) {
      throw new BadRequestException('No se encontró el asset externo origen dentro de esta entity');
    }

    return match;
  }

  private async findPromotedIngestedLinkForExternal(
    entityId: string,
    externalLinkId: string,
    externalMediaId: string,
  ) {
    const candidates = await this.prisma.entityMedia.findMany({
      where: {
        entityId,
        id: {
          not: externalLinkId,
        },
        media: {
          originType: MediaOriginType.INGESTED,
          derivedFromMediaId: externalMediaId,
        },
      },
      include: {
        media: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    return (
      candidates.find((candidate) => candidate.role !== MediaRole.GALLERY || candidate.isPrimary) ??
      candidates[0] ??
      null
    );
  }

  private inferOriginalFilename(urlValue: string, fallbackExt: string): string {
    try {
      const parsed = new URL(urlValue);
      const candidate = parsed.pathname.split('/').pop()?.trim();
      if (candidate) {
        return candidate;
      }
    } catch {
      // ignore invalid URL parsing and use fallback
    }

    return `ingested${fallbackExt}`;
  }

  private inferFileExtension(urlValue: string, mimeType: string | null): string {
    if (mimeType && MIME_EXTENSION_MAP[mimeType]) {
      return MIME_EXTENSION_MAP[mimeType];
    }

    try {
      const parsed = new URL(urlValue);
      const extension = extname(parsed.pathname);
      if (extension) {
        return extension;
      }
    } catch {
      // ignore invalid URL parsing and use fallback
    }

    return '.jpg';
  }

  async adminIngestMedia(entityId: string, linkId: string) {
    const link = await this.prisma.entityMedia.findFirst({
      where: {
        id: linkId,
        entityId,
      },
      include: {
        media: true,
      },
    });

    if (!link) {
      throw new NotFoundException('Entity media link not found');
    }

    if (link.media.originType !== MediaOriginType.EXTERNAL_URL) {
      throw new BadRequestException('Solo se pueden ingestar assets con origen EXTERNAL_URL');
    }

    const existingDerived = await this.prisma.entityMedia.findFirst({
      where: {
        entityId,
        media: {
          originType: MediaOriginType.INGESTED,
          derivedFromMediaId: link.media.id,
        },
      },
      include: {
        media: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (existingDerived) {
      return {
        ...existingDerived,
        alreadyExisted: true,
      };
    }

    const sourceUrl = link.media.displayUrl?.trim() || link.media.url?.trim();
    if (!sourceUrl) {
      throw new BadRequestException('La media externa no tiene una URL descargable');
    }

    let response: Response;

    try {
      response = await fetch(sourceUrl);
    } catch {
      throw new BadRequestException('No se pudo descargar la media externa');
    }

    if (!response.ok) {
      throw new BadRequestException(`La descarga devolvió ${response.status}`);
    }

    const mimeType = this.normalizeMimeType(response.headers.get('content-type'));
    if (!mimeType || !ALLOWED_INGEST_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('La ingestión solo admite JPEG, PNG, WEBP, GIF o AVIF');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      throw new BadRequestException('La descarga no devolvió contenido útil');
    }

    if (buffer.length > MAX_INGEST_SIZE_BYTES) {
      throw new BadRequestException(
        'La media externa supera el tamaño máximo permitido para ingestión',
      );
    }

    const detectedDimensions = detectImageDimensionsFromBuffer(buffer, mimeType);

    const extension = this.inferFileExtension(sourceUrl, mimeType);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const storageKey = `media/ingested/${filename}`;
    const storagePath = join(process.cwd(), 'uploads', storageKey);

    await mkdir(join(process.cwd(), 'uploads', 'media', 'ingested'), { recursive: true });

    try {
      await writeFile(storagePath, buffer);
    } catch {
      throw new BadRequestException('No se pudo guardar la media ingerida en el storage local');
    }

    try {
      const maxSort = await this.prisma.entityMedia.aggregate({
        where: {
          entityId,
          role: MediaRole.GALLERY,
        },
        _max: {
          sortOrder: true,
        },
      });

      const publicUrl = this.buildPublicUploadUrl(storageKey);
      const sourceReference =
        link.media.canonicalUrl?.trim() ||
        link.media.displayUrl?.trim() ||
        link.media.url?.trim() ||
        sourceUrl;

      const created = await this.prisma.$transaction(async (tx) => {
        const media = await tx.media.create({
          data: {
            url: publicUrl,
            canonicalUrl: sourceReference,
            displayUrl: publicUrl,
            sourcePageUrl: link.media.sourcePageUrl?.trim() || undefined,
            storageKey,
            originalFilename: this.inferOriginalFilename(sourceUrl, extension),
            fileSize: buffer.length,
            mimeType,
            width: detectedDimensions.width ?? link.media.width ?? undefined,
            height: detectedDimensions.height ?? link.media.height ?? undefined,
            provider: link.media.provider,
            qualityTier: link.media.qualityTier,
            originType: MediaOriginType.INGESTED,
            derivedFromMediaId: link.media.id,
            alt: link.media.alt?.trim() || undefined,
            source: link.media.source?.trim() || undefined,
            photoBy: link.media.photoBy?.trim() || undefined,
            license: link.media.license?.trim() || undefined,
          },
        });

        return tx.entityMedia.create({
          data: {
            entityId,
            mediaId: media.id,
            role: MediaRole.GALLERY,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            isPrimary: false,
            displayMode: link.displayMode ?? null,
            focalX: link.focalX ?? null,
            focalY: link.focalY ?? null,
          },
          include: {
            media: true,
          },
        });
      });

      return created;
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async adminPromoteIngestedMedia(entityId: string, linkId: string) {
    const ingestedLink = await this.prisma.entityMedia.findFirst({
      where: {
        id: linkId,
        entityId,
      },
      include: {
        media: true,
      },
    });

    if (!ingestedLink) {
      throw new NotFoundException('Entity media link not found');
    }

    if (ingestedLink.media.originType !== MediaOriginType.INGESTED) {
      throw new BadRequestException('Solo se pueden promover assets con origen INGESTED');
    }

    const sourceExternalLink = await this.findSourceExternalLinkForIngested(
      entityId,
      linkId,
      ingestedLink.mediaId,
      ingestedLink.media.canonicalUrl,
    );

    const galleryMax = await this.prisma.entityMedia.aggregate({
      where: {
        entityId,
        role: MediaRole.GALLERY,
        id: {
          notIn: [linkId, sourceExternalLink.id],
        },
      },
      _max: {
        sortOrder: true,
      },
    });

    const promotedLink = await this.prisma.$transaction(async (tx) => {
      await tx.entityMedia.update({
        where: { id: linkId },
        data: {
          role: sourceExternalLink.role,
          sortOrder: sourceExternalLink.sortOrder,
          isPrimary: sourceExternalLink.isPrimary,
          displayMode: sourceExternalLink.displayMode ?? null,
          focalX: sourceExternalLink.focalX ?? null,
          focalY: sourceExternalLink.focalY ?? null,
        },
      });

      await tx.entityMedia.update({
        where: { id: sourceExternalLink.id },
        data: {
          role: MediaRole.GALLERY,
          sortOrder: (galleryMax._max.sortOrder ?? -1) + 1,
          isPrimary: false,
        },
      });

      if (sourceExternalLink.isPrimary) {
        await this.media.clearOtherLegacyPrimaries(tx, entityId, linkId);
      }

      return tx.entityMedia.findUniqueOrThrow({
        where: { id: linkId },
        include: {
          media: true,
        },
      });
    });

    const updatedSourceLink = await this.prisma.entityMedia.findUniqueOrThrow({
      where: { id: sourceExternalLink.id },
      include: {
        media: true,
      },
    });

    return {
      promotedLink,
      sourceLink: updatedSourceLink,
    };
  }

  async adminRestoreExternalMedia(entityId: string, linkId: string) {
    const externalLink = await this.prisma.entityMedia.findFirst({
      where: {
        id: linkId,
        entityId,
      },
      include: {
        media: true,
      },
    });

    if (!externalLink) {
      throw new NotFoundException('Entity media link not found');
    }

    if (externalLink.media.originType !== MediaOriginType.EXTERNAL_URL) {
      throw new BadRequestException('Solo se puede restaurar un asset con origen EXTERNAL_URL');
    }

    const promotedIngestedLink = await this.findPromotedIngestedLinkForExternal(
      entityId,
      linkId,
      externalLink.mediaId,
    );

    if (!promotedIngestedLink) {
      throw new BadRequestException(
        'No hay un asset INGESTED promovido que restaurar para este externo',
      );
    }

    const galleryMax = await this.prisma.entityMedia.aggregate({
      where: {
        entityId,
        role: MediaRole.GALLERY,
        id: {
          notIn: [linkId, promotedIngestedLink.id],
        },
      },
      _max: {
        sortOrder: true,
      },
    });

    const restoredLink = await this.prisma.$transaction(async (tx) => {
      await tx.entityMedia.update({
        where: { id: linkId },
        data: {
          role: promotedIngestedLink.role,
          sortOrder: promotedIngestedLink.sortOrder,
          isPrimary: promotedIngestedLink.isPrimary,
          displayMode: promotedIngestedLink.displayMode ?? null,
          focalX: promotedIngestedLink.focalX ?? null,
          focalY: promotedIngestedLink.focalY ?? null,
        },
      });

      if (promotedIngestedLink.isPrimary) {
        await this.media.clearOtherLegacyPrimaries(tx, entityId, linkId);
      }

      await tx.entityMedia.update({
        where: { id: promotedIngestedLink.id },
        data: {
          role: MediaRole.GALLERY,
          sortOrder: (galleryMax._max.sortOrder ?? -1) + 1,
          isPrimary: false,
        },
      });

      return tx.entityMedia.findUniqueOrThrow({
        where: { id: linkId },
        include: {
          media: true,
        },
      });
    });

    const updatedIngestedLink = await this.prisma.entityMedia.findUniqueOrThrow({
      where: { id: promotedIngestedLink.id },
      include: {
        media: true,
      },
    });

    return {
      restoredLink,
      ingestedLink: updatedIngestedLink,
    };
  }
}
