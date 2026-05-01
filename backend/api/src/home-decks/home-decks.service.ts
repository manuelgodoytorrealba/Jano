import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface, MediaOriginType, Prisma } from '@prisma/client';
import { readFile } from 'fs/promises';
import { detectImageDimensionsFromBuffer } from '../entities/image-metadata';
import { attachResolvedMedia } from '../entities/media.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { AddHomeDeckEntityDto } from './dto/add-home-deck-entity.dto';
import { CreateHomeDeckDto } from './dto/create-home-deck.dto';
import { ReorderHomeDeckEntityDto } from './dto/reorder-home-deck-entity.dto';
import { UpdateHomeDeckDto } from './dto/update-home-deck.dto';
import { UploadHomeDeckImageDto } from './dto/upload-home-deck-image.dto';

type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type HomeDeckWarning = {
  code:
    | 'missing_title'
    | 'missing_image'
    | 'missing_description'
    | 'missing_entities'
    | 'no_published_entities'
    | 'inactive'
    | 'unpublished_entity'
    | 'long_description';
  severity: 'info' | 'warning';
  message: string;
};

@Injectable()
export class HomeDecksService {
  private readonly mediaPublicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  constructor(private prisma: PrismaService) {}

  async listPublic(surface: HomeDeckSurface = HomeDeckSurface.HOME) {
    const safeSurface = Object.values(HomeDeckSurface).includes(surface) ? surface : HomeDeckSurface.HOME;

    const decks = await this.prisma.homeDeck.findMany({
      where: { isActive: true, surface: safeSurface },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.deckInclude({
        onlyPublishedItems: true,
      }),
    });

    return decks.map((deck) => this.serializePublicDeck(deck));
  }

  async adminList() {
    const decks = await this.prisma.homeDeck.findMany({
      orderBy: [{ surface: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.deckInclude(),
    });

    return decks.map((deck) => this.serializeAdminDeck(deck));
  }

  async adminGetById(id: string) {
    const deck = await this.prisma.homeDeck.findUnique({
      where: { id },
      include: this.deckInclude(),
    });

    if (!deck) {
      throw new NotFoundException('Home deck not found');
    }

    return this.serializeAdminDeck(deck);
  }

  async create(dto: CreateHomeDeckDto) {
    this.assertCtaTarget(dto);

    const deck = await this.prisma.homeDeck.create({
      data: this.buildCreateDeckData(dto),
      include: this.deckInclude(),
    });

    return this.serializeAdminDeck(deck);
  }

  async update(id: string, dto: UpdateHomeDeckDto) {
    await this.ensureDeck(id);
    this.assertCtaTarget(dto);

    const deck = await this.prisma.homeDeck.update({
      where: { id },
      data: this.buildUpdateDeckData(dto),
      include: this.deckInclude(),
    });

    return this.serializeAdminDeck(deck);
  }

  async remove(id: string) {
    await this.ensureDeck(id);
    await this.prisma.homeDeck.delete({ where: { id } });
    return { ok: true };
  }

  async addEntity(deckId: string, dto: AddHomeDeckEntityDto) {
    await this.ensureDeck(deckId);
    await this.ensureEntity(dto.entityId);

    const existing = await this.prisma.homeDeckItem.findFirst({
      where: {
        deckId,
        entityId: dto.entityId,
      },
    });

    if (existing) {
      throw new ConflictException('Entity already exists in home deck');
    }

    const sortOrder = dto.sortOrder ?? await this.nextItemSortOrder(deckId);

    await this.prisma.homeDeckItem.create({
      data: {
        deckId,
        entityId: dto.entityId,
        sortOrder,
      },
    });

    return this.adminGetById(deckId);
  }

  async removeEntity(deckId: string, entityId: string) {
    await this.ensureDeck(deckId);

    const item = await this.prisma.homeDeckItem.findFirst({
      where: { deckId, entityId },
    });

    if (!item) {
      throw new NotFoundException('Home deck entity not found');
    }

    await this.prisma.homeDeckItem.delete({ where: { id: item.id } });
    return this.adminGetById(deckId);
  }

  async reorderEntity(deckId: string, entityId: string, dto: ReorderHomeDeckEntityDto) {
    await this.ensureDeck(deckId);

    const item = await this.prisma.homeDeckItem.findFirst({
      where: { deckId, entityId },
    });

    if (!item) {
      throw new NotFoundException('Home deck entity not found');
    }

    await this.prisma.homeDeckItem.update({
      where: { id: item.id },
      data: { sortOrder: dto.sortOrder },
    });

    return this.adminGetById(deckId);
  }

  async uploadImage(deckId: string, file: UploadedImageFile | undefined, dto: UploadHomeDeckImageDto) {
    await this.ensureDeck(deckId);

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

    const deck = await this.prisma.$transaction(async (tx) => {
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
          source: dto.source?.trim() || 'Uploaded via home deck admin',
          photoBy: dto.photoBy?.trim() || undefined,
          license: dto.license?.trim() || undefined,
        },
      });

      return tx.homeDeck.update({
        where: { id: deckId },
        data: {
          imageMediaId: media.id,
          imageUrl: null,
        },
        include: this.deckInclude(),
      });
    });

    return this.serializeAdminDeck(deck);
  }

  private deckInclude(options: { onlyPublishedItems?: boolean } = {}) {
    return {
      imageMedia: true,
      items: {
        where: options.onlyPublishedItems
          ? {
              entity: {
                status: EntityStatus.PUBLISHED,
              },
            }
          : undefined,
        include: {
          entity: {
            include: {
              mediaLinks: {
                include: { media: true },
                orderBy: [
                  { sortOrder: 'asc' as const },
                  { id: 'asc' as const },
                ],
              },
            },
          },
        },
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },
    };
  }

  private serializePublicDeck(deck: any) {
    return {
      id: deck.id,
      surface: deck.surface,
      slug: deck.slug,
      title: deck.title,
      subtitle: deck.subtitle,
      description: deck.description,
      ctaLabel: deck.ctaLabel,
      ctaUrl: deck.ctaUrl,
      ctaRoute: deck.ctaRoute,
      image: this.serializeDeckImage(deck),
      sortOrder: deck.sortOrder,
      entities: this.serializeItems(deck.items),
    };
  }

  private serializeAdminDeck(deck: any) {
    const serialized = {
      ...this.serializePublicDeck(deck),
      imageUrl: deck.imageUrl,
      imageMediaId: deck.imageMediaId,
      isActive: deck.isActive,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      warnings: this.buildWarnings(deck),
    };

    return serialized;
  }

  private serializeItems(items: any[]) {
    return (items ?? []).map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      entity: attachResolvedMedia(item.entity),
    }));
  }

  private serializeDeckImage(deck: any) {
    if (deck.imageMedia) {
      return {
        id: deck.imageMedia.id,
        url: deck.imageMedia.displayUrl ?? deck.imageMedia.url,
        width: deck.imageMedia.width ?? null,
        height: deck.imageMedia.height ?? null,
        alt: deck.imageMedia.alt ?? deck.title,
        source: deck.imageMedia.source ?? null,
      };
    }

    if (deck.imageUrl) {
      return {
        id: null,
        url: deck.imageUrl,
        width: null,
        height: null,
        alt: deck.title,
        source: null,
      };
    }

    return null;
  }

  private buildWarnings(deck: any): HomeDeckWarning[] {
    const warnings: HomeDeckWarning[] = [];

    if (!deck.title?.trim()) {
      warnings.push({
        code: 'missing_title',
        severity: 'warning',
        message: 'Deck has no title.',
      });
    }

    if (!deck.imageUrl && !deck.imageMediaId) {
      warnings.push({
        code: 'missing_image',
        severity: 'warning',
        message: 'Deck has no main image.',
      });
    }

    if (!deck.description?.trim()) {
      warnings.push({
        code: 'missing_description',
        severity: 'info',
        message: 'Deck has no description.',
      });
    }

    if (!deck.items?.length) {
      warnings.push({
        code: 'missing_entities',
        severity: 'warning',
        message: 'Deck has no selected entities.',
      });
    }

    if (deck.items?.length && !deck.items.some((item: any) => item.entity?.status === EntityStatus.PUBLISHED)) {
      warnings.push({
        code: 'no_published_entities',
        severity: 'warning',
        message: 'Deck has selected entities, but none are published for the public home.',
      });
    }

    if (!deck.isActive) {
      warnings.push({
        code: 'inactive',
        severity: 'info',
        message: 'Deck is inactive and hidden from the public home.',
      });
    }

    for (const item of deck.items ?? []) {
      if (item.entity?.status !== EntityStatus.PUBLISHED) {
        warnings.push({
          code: 'unpublished_entity',
          severity: 'warning',
          message: `Entity "${item.entity?.title ?? item.entityId}" is not published.`,
        });
      }
    }

    if ((deck.description?.length ?? 0) > 260) {
      warnings.push({
        code: 'long_description',
        severity: 'info',
        message: 'Deck description may be too long for the home card.',
      });
    }

    return warnings;
  }

  private buildCreateDeckData(dto: CreateHomeDeckDto): Prisma.HomeDeckUncheckedCreateInput {
    return {
      slug: dto.slug.trim(),
      surface: dto.surface ?? HomeDeckSurface.HOME,
      title: dto.title.trim(),
      subtitle: this.optionalTrim(dto.subtitle),
      description: this.optionalTrim(dto.description),
      ctaLabel: this.optionalTrim(dto.ctaLabel),
      ctaUrl: this.optionalTrim(dto.ctaUrl),
      ctaRoute: this.optionalTrim(dto.ctaRoute),
      imageUrl: this.optionalTrim(dto.imageUrl),
      imageMediaId: this.optionalTrim(dto.imageMediaId),
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    };
  }

  private buildUpdateDeckData(dto: UpdateHomeDeckDto): Prisma.HomeDeckUncheckedUpdateInput {
    return {
      slug: this.optionalRequiredTrim(dto.slug),
      surface: dto.surface,
      title: this.optionalRequiredTrim(dto.title),
      subtitle: this.optionalTrim(dto.subtitle),
      description: this.optionalTrim(dto.description),
      ctaLabel: this.optionalTrim(dto.ctaLabel),
      ctaUrl: this.optionalTrim(dto.ctaUrl),
      ctaRoute: this.optionalTrim(dto.ctaRoute),
      imageUrl: this.optionalTrim(dto.imageUrl),
      imageMediaId: this.optionalTrim(dto.imageMediaId),
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    };
  }

  private optionalTrim(value: string | undefined) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private optionalRequiredTrim(value: string | undefined) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private assertCtaTarget(dto: CreateHomeDeckDto | UpdateHomeDeckDto) {
    if (dto.ctaRoute && dto.ctaUrl) {
      throw new BadRequestException('Use either ctaRoute or ctaUrl, not both');
    }
  }

  private async ensureDeck(id: string) {
    const deck = await this.prisma.homeDeck.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!deck) {
      throw new NotFoundException('Home deck not found');
    }
  }

  private async ensureEntity(id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }
  }

  private async nextItemSortOrder(deckId: string) {
    const aggregate = await this.prisma.homeDeckItem.aggregate({
      where: { deckId },
      _max: { sortOrder: true },
    });

    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private buildPublicUploadUrl(storageKey: string): string {
    return `${this.mediaPublicBaseUrl}/uploads/${storageKey}`;
  }
}
