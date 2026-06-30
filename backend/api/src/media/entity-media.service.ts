import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaOriginType, MediaRole, Prisma } from '@prisma/client';
import { readFile } from 'fs/promises';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityMediaDto } from '../entities/dto/create-entity-media.dto';
import { UpdateEntityMediaDto } from '../entities/dto/update-entity-media.dto';
import { UploadEntityMediaDto } from '../entities/dto/upload-entity-media.dto';
import { detectImageDimensionsFromBuffer } from './image-metadata';

export type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type SlotCropInput =
  | {
      explorer3d?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
      list?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
      detail?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
      preview?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
    }
  | null
  | undefined;

@Injectable()
export class EntityMediaService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

  constructor(private readonly prisma: PrismaService) {}

  private buildPublicUploadUrl(storageKey: string): string {
    return buildPublicUploadUrl(storageKey, this.mediaPublicBaseUrl);
  }

  private normalizePercent(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }

    return Math.min(100, Math.max(0, Number(value)));
  }

  private normalizeZoom(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }

    return Math.min(3, Math.max(1, Number(value)));
  }

  private normalizeCropPreset(
    value: { x?: number | null; y?: number | null; zoom?: number | null } | null | undefined,
  ) {
    if (!value) {
      return null;
    }

    const x = this.normalizePercent(value.x);
    const y = this.normalizePercent(value.y);
    const zoom = this.normalizeZoom(value.zoom);

    if (x === null && y === null && zoom === null) {
      return null;
    }

    return { x, y, zoom };
  }

  private normalizeCropPresetJson(
    value: { x?: number | null; y?: number | null; zoom?: number | null } | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return this.normalizeCropPreset(value) ?? Prisma.JsonNull;
  }

  private slotCropColumns(input: SlotCropInput) {
    return {
      cropExplorer3d: this.normalizeCropPresetJson(input?.explorer3d),
      cropList: this.normalizeCropPresetJson(input?.list),
      cropDetail: this.normalizeCropPresetJson(input?.detail),
      cropPreview: this.normalizeCropPresetJson(input?.preview),
    };
  }

  async clearOtherLegacyPrimaries(
    tx: {
      entityMedia: { updateMany: (args: Prisma.EntityMediaUpdateManyArgs) => Promise<unknown> };
    },
    entityId: string,
    activeLinkId: string,
  ) {
    await tx.entityMedia.updateMany({
      where: {
        entityId,
        id: { not: activeLinkId },
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  async normalizeLegacyPrimary(entityId: string) {
    const activeLegacyLinks = await this.prisma.entityMedia.findMany({
      where: {
        entityId,
        isPrimary: true,
      },
      select: {
        id: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (activeLegacyLinks.length <= 1) {
      return;
    }

    const extra = activeLegacyLinks.slice(1);
    await this.prisma.entityMedia.updateMany({
      where: {
        entityId,
        id: {
          in: extra.map((link) => link.id),
        },
      },
      data: {
        isPrimary: false,
      },
    });
  }

  async adminCreateMedia(entityId: string, dto: CreateEntityMediaDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          url: dto.url.trim(),
          originType: MediaOriginType.EXTERNAL_URL,
          displayUrl: dto.displayUrl?.trim() || undefined,
          sourcePageUrl: dto.sourcePageUrl?.trim() || undefined,
          alt: dto.alt?.trim() || undefined,
          source: dto.source?.trim() || undefined,
          photoBy: dto.photoBy?.trim() || undefined,
          license: dto.license?.trim() || undefined,
          focalX: this.normalizePercent(dto.assetFocalX) ?? undefined,
          focalY: this.normalizePercent(dto.assetFocalY) ?? undefined,
        } satisfies Prisma.MediaCreateInput,
      });

      const createdLink = await tx.entityMedia.create({
        data: {
          entityId,
          mediaId: media.id,
          role: dto.role ?? MediaRole.CARD,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
          displayMode: dto.displayMode ?? null,
          focalX: dto.focalX ?? null,
          focalY: dto.focalY ?? null,
          ...this.slotCropColumns(dto.slotCrops),
        } satisfies Prisma.EntityMediaUncheckedCreateInput,
        include: {
          media: true,
        },
      });

      if (dto.isPrimary) {
        await this.clearOtherLegacyPrimaries(tx, entityId, createdLink.id);
      }

      return createdLink;
    });
  }

  async adminUploadMedia(
    entityId: string,
    file: UploadedImageFile | undefined,
    dto: UploadEntityMediaDto,
  ) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten imágenes raster válidas');
    }

    const fileBuffer = await readFile(file.path);
    const dimensions = detectImageDimensionsFromBuffer(fileBuffer, file.mimetype);

    const storageKey = `media/${file.filename}`;
    const publicUrl = this.buildPublicUploadUrl(storageKey);

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          url: publicUrl,
          canonicalUrl: publicUrl,
          displayUrl: publicUrl,
          originType: MediaOriginType.UPLOAD,
          storageKey,
          originalFilename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          width: dimensions.width ?? undefined,
          height: dimensions.height ?? undefined,
          alt: dto.alt?.trim() || undefined,
          source: dto.source?.trim() || 'Uploaded via admin',
          photoBy: dto.photoBy?.trim() || undefined,
          license: dto.license?.trim() || undefined,
          focalX: this.normalizePercent(dto.assetFocalX) ?? undefined,
          focalY: this.normalizePercent(dto.assetFocalY) ?? undefined,
        } satisfies Prisma.MediaCreateInput,
      });

      const createdLink = await tx.entityMedia.create({
        data: {
          entityId,
          mediaId: media.id,
          role: dto.role ?? MediaRole.CARD,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
          displayMode: dto.displayMode ?? null,
          focalX: dto.focalX ?? null,
          focalY: dto.focalY ?? null,
          ...this.slotCropColumns(dto.slotCrops),
        } satisfies Prisma.EntityMediaUncheckedCreateInput,
        include: {
          media: true,
        },
      });

      if (dto.isPrimary) {
        await this.clearOtherLegacyPrimaries(tx, entityId, createdLink.id);
      }

      return createdLink;
    });
  }

  async adminUpdateMedia(entityId: string, linkId: string, dto: UpdateEntityMediaDto) {
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

    if (
      link.media.originType !== MediaOriginType.EXTERNAL_URL &&
      ((dto.url !== undefined && dto.url.trim() !== link.media.url) ||
        (dto.displayUrl !== undefined &&
          (dto.displayUrl?.trim() || null) !== (link.media.displayUrl ?? null)))
    ) {
      throw new BadRequestException(
        'No se puede editar manualmente URL o display URL en assets locales',
      );
    }

    const mediaData = {
      url: dto.url?.trim(),
      displayUrl: dto.displayUrl !== undefined ? dto.displayUrl?.trim() || null : undefined,
      sourcePageUrl:
        dto.sourcePageUrl !== undefined ? dto.sourcePageUrl?.trim() || null : undefined,
      alt: dto.alt !== undefined ? dto.alt?.trim() || null : undefined,
      source: dto.source !== undefined ? dto.source?.trim() || null : undefined,
      photoBy: dto.photoBy !== undefined ? dto.photoBy?.trim() || null : undefined,
      license: dto.license !== undefined ? dto.license?.trim() || null : undefined,
      focalX: dto.assetFocalX === undefined ? undefined : this.normalizePercent(dto.assetFocalX),
      focalY: dto.assetFocalY === undefined ? undefined : this.normalizePercent(dto.assetFocalY),
    };

    const linkData = {
      role: dto.role,
      sortOrder: dto.sortOrder,
      isPrimary: dto.isPrimary,
      displayMode: dto.displayMode === undefined ? undefined : (dto.displayMode ?? null),
      focalX: dto.focalX === undefined ? undefined : (dto.focalX ?? null),
      focalY: dto.focalY === undefined ? undefined : (dto.focalY ?? null),
      ...(dto.slotCrops === undefined ? {} : this.slotCropColumns(dto.slotCrops)),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.values(mediaData).some((value) => value !== undefined)) {
        await tx.media.update({
          where: { id: link.mediaId },
          data: mediaData,
        });
      }

      if (Object.values(linkData).some((value) => value !== undefined)) {
        await tx.entityMedia.update({
          where: { id: linkId },
          data: linkData satisfies Prisma.EntityMediaUpdateInput,
        });

        if (dto.isPrimary === true) {
          await this.clearOtherLegacyPrimaries(tx, entityId, linkId);
        }
      }
    });

    return this.prisma.entityMedia.findUnique({
      where: { id: linkId },
      include: {
        media: true,
      },
    });
  }

  async adminDeleteMedia(entityId: string, linkId: string) {
    const link = await this.prisma.entityMedia.findFirst({
      where: {
        id: linkId,
        entityId,
      },
      select: { id: true },
    });

    if (!link) {
      throw new NotFoundException('Entity media link not found');
    }

    await this.prisma.entityMedia.delete({
      where: { id: linkId },
    });

    return { ok: true };
  }
}
