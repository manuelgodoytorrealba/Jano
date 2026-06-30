import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, HomeDeckSurface, MediaOriginType, Prisma } from '@prisma/client';
import { normalizeLocale } from '../entities/entity-translation.resolver';
import { readFile } from 'fs/promises';
import { detectImageDimensionsFromBuffer } from '../media/image-metadata';
import { PrismaService } from '../prisma/prisma.service';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
import { AddHomeDeckEntityDto } from './dto/add-home-deck-entity.dto';
import { CreateHomeDeckDto } from './dto/create-home-deck.dto';
import { ReorderHomeDeckEntityDto } from './dto/reorder-home-deck-entity.dto';
import { UpdateHomeDeckDto } from './dto/update-home-deck.dto';
import { UploadHomeDeckImageDto } from './dto/upload-home-deck-image.dto';
import { presentAdminHomeDeck, presentPublicHomeDeck } from './home-deck.presenter';
import { buildHomeDeckWarnings } from './home-deck-warnings';

type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type NormalizedDeckTranslation = {
  locale: string;
  title: string;
  subtitle: string | null | undefined;
  description: string | null | undefined;
  ctaLabel: string | null | undefined;
};

@Injectable()
export class HomeDecksService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

  constructor(private prisma: PrismaService) {}

  async listPublic(surface: HomeDeckSurface = HomeDeckSurface.HOME, locale?: string) {
    const safeSurface = Object.values(HomeDeckSurface).includes(surface)
      ? surface
      : HomeDeckSurface.HOME;

    const decks = await this.prisma.homeDeck.findMany({
      where: { isActive: true, surface: safeSurface },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.deckInclude({
        onlyPublishedItems: true,
        locale,
      }),
    });

    return decks.map((deck) => presentPublicHomeDeck(deck, locale));
  }

  async adminList() {
    const decks = await this.prisma.homeDeck.findMany({
      orderBy: [{ surface: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.deckInclude(),
    });

    return decks.map((deck) => presentAdminHomeDeck(deck, buildHomeDeckWarnings(deck)));
  }

  async adminGetById(id: string) {
    const deck = await this.prisma.homeDeck.findUnique({
      where: { id },
      include: this.deckInclude(),
    });

    if (!deck) {
      throw new NotFoundException('Home deck not found');
    }

    return presentAdminHomeDeck(deck, buildHomeDeckWarnings(deck));
  }

  async create(dto: CreateHomeDeckDto) {
    this.assertCtaTarget(dto);

    const deck = await this.prisma.homeDeck.create({
      data: this.buildCreateDeckData(dto),
      include: this.deckInclude(),
    });

    await this.upsertDeckTranslations(deck.id, dto);

    return this.adminGetById(deck.id);
  }

  async update(id: string, dto: UpdateHomeDeckDto) {
    await this.ensureDeck(id);
    this.assertCtaTarget(dto);

    await this.prisma.homeDeck.update({
      where: { id },
      data: this.buildUpdateDeckData(dto),
      include: this.deckInclude(),
    });

    await this.upsertDeckTranslations(id, dto);

    return this.adminGetById(id);
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

    const sortOrder = dto.sortOrder ?? (await this.nextItemSortOrder(deckId));

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

  async uploadImage(
    deckId: string,
    file: UploadedImageFile | undefined,
    dto: UploadHomeDeckImageDto,
  ) {
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

    return presentAdminHomeDeck(deck, buildHomeDeckWarnings(deck));
  }

  private deckInclude(options: { onlyPublishedItems?: boolean; locale?: string } = {}) {
    const locale = normalizeLocale(options.locale);

    return {
      imageMedia: true,
      translations: {
        where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
      },
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
            include: this.entityInclude(locale),
          },
        },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
    };
  }

  private entityInclude(locale: string) {
    return {
      translations: {
        where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
      },
      mediaLinks: {
        include: { media: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
    };
  }

  private async upsertDeckTranslations(deckId: string, dto: CreateHomeDeckDto | UpdateHomeDeckDto) {
    const translations = this.normalizeDeckTranslations(dto);

    for (const translation of translations) {
      await this.prisma.homeDeckTranslation.upsert({
        where: {
          homeDeckId_locale: {
            homeDeckId: deckId,
            locale: translation.locale,
          },
        },
        update: {
          title: translation.title,
          subtitle: translation.subtitle,
          description: translation.description,
          ctaLabel: translation.ctaLabel,
        },
        create: {
          homeDeckId: deckId,
          locale: translation.locale,
          title: translation.title,
          subtitle: translation.subtitle,
          description: translation.description,
          ctaLabel: translation.ctaLabel,
        },
      });
    }
  }

  private normalizeDeckTranslations(dto: CreateHomeDeckDto | UpdateHomeDeckDto) {
    const incoming = (dto.translations ?? [])
      .map(
        (item): NormalizedDeckTranslation => ({
          locale: normalizeLocale(item?.locale),
          title: item?.title?.trim(),
          subtitle: this.optionalTrim(item?.subtitle),
          description: this.optionalTrim(item?.description),
          ctaLabel: this.optionalTrim(item?.ctaLabel),
        }),
      )
      .filter((item) => !!item.title);

    const hasSpanish = incoming.some((item) => item.locale === 'es');
    if (!hasSpanish && dto.title !== undefined) {
      const title = this.optionalRequiredTrim(dto.title);
      if (title) {
        incoming.push({
          locale: 'es',
          title,
          subtitle: this.optionalTrim(dto.subtitle),
          description: this.optionalTrim(dto.description),
          ctaLabel: this.optionalTrim(dto.ctaLabel),
        });
      }
    }

    return incoming;
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
    return buildPublicUploadUrl(storageKey, this.mediaPublicBaseUrl);
  }
}
