import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface, MediaOriginType, Prisma } from '@prisma/client';
import { normalizeLocale, resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { readFile } from 'fs/promises';
import { detectImageDimensionsFromBuffer } from '../entities/image-metadata';
import { attachResolvedMedia } from '../entities/media.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { buildPublicUploadUrl, normalizeStoredUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
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

type VirtualHomeDeckDefinition = {
  slug: string;
  ctaRoute: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  imageUrl: string;
  entitySlugs: string[];
  translations: {
    locale: string;
    title: string;
    subtitle: string;
    description: string;
    ctaLabel: string;
  }[];
};

// ponytail: admin-only compatibility fallback; seed data is the normal source of truth.
const VIRTUAL_HOME_DECKS: VirtualHomeDeckDefinition[] = [
  {
    slug: 'place',
    ctaRoute: '/entities/place',
    title: 'Lugares',
    subtitle: 'Contexto institucional',
    description: 'Museos, colecciones y espacios que anclan obras, movimientos y memoria pública.',
    ctaLabel: 'Explorar lugares',
    imageUrl: '/assets/home/museum-room.jpg',
    entitySlugs: ['museo-del-prado', 'museo-reina-sofia', 'moma', 'guggenheim-bilbao'],
    translations: [
      {
        locale: 'es',
        title: 'Lugares',
        subtitle: 'Contexto institucional',
        description: 'Museos, colecciones y espacios que anclan obras, movimientos y memoria pública.',
        ctaLabel: 'Explorar lugares',
      },
      {
        locale: 'en',
        title: 'Places',
        subtitle: 'Institutional context',
        description: 'Museums, collections and spaces that anchor works, movements and public memory.',
        ctaLabel: 'Explore places',
      },
    ],
  },
];

@Injectable()
export class HomeDecksService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(process.env.MEDIA_PUBLIC_BASE_URL);

  constructor(private prisma: PrismaService) {}

  async listPublic(surface: HomeDeckSurface = HomeDeckSurface.HOME, locale?: string) {
    const safeSurface = Object.values(HomeDeckSurface).includes(surface) ? surface : HomeDeckSurface.HOME;

    const decks = await this.prisma.homeDeck.findMany({
      where: { isActive: true, surface: safeSurface },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.deckInclude({
        onlyPublishedItems: true,
        locale,
      }),
    });

    const resolvedDecks = await this.appendVirtualHomeDecksIfMissing(decks, safeSurface, locale);
    return resolvedDecks.map((deck) => this.serializePublicDeck(deck, locale));
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

    await this.upsertDeckTranslations(deck.id, dto);

    return this.adminGetById(deck.id);
  }

  async materializeVirtualDeck(slug: string) {
    const normalizedSlug = (slug ?? '').trim().toLowerCase();
    const definition = VIRTUAL_HOME_DECKS.find((candidate) => candidate.slug === normalizedSlug);

    if (!definition) {
      throw new NotFoundException('Virtual home deck not found');
    }

    const existing = await this.prisma.homeDeck.findFirst({
      where: {
        surface: HomeDeckSurface.HOME,
        OR: [
          { slug: definition.slug },
          { ctaRoute: definition.ctaRoute },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Home deck already exists');
    }

    const entities = await this.prisma.entity.findMany({
      where: {
        status: EntityStatus.PUBLISHED,
        slug: { in: definition.entitySlugs },
      },
      select: { id: true, slug: true },
    });

    const entitiesBySlug = new Map(entities.map((entity) => [entity.slug, entity]));
    const orderedEntities = definition.entitySlugs
      .map((entitySlug) => entitiesBySlug.get(entitySlug))
      .filter((entity): entity is { id: string; slug: string } => !!entity);

    const latestDeck = await this.prisma.homeDeck.findFirst({
      where: { surface: HomeDeckSurface.HOME },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });

    const deck = await this.prisma.homeDeck.create({
      data: {
        slug: definition.slug,
        surface: HomeDeckSurface.HOME,
        title: definition.title,
        subtitle: definition.subtitle,
        description: definition.description,
        ctaLabel: definition.ctaLabel,
        ctaRoute: definition.ctaRoute,
        imageUrl: definition.imageUrl,
        sortOrder: (latestDeck?.sortOrder ?? -1) + 1,
        isActive: true,
        translations: {
          create: definition.translations.map((translation) => ({
            locale: translation.locale,
            title: translation.title,
            subtitle: translation.subtitle,
            description: translation.description,
            ctaLabel: translation.ctaLabel,
          })),
        },
        items: {
          create: orderedEntities.map((entity, index) => ({
            entityId: entity.id,
            sortOrder: index,
          })),
        },
      },
      include: this.deckInclude(),
    });

    return this.serializeAdminDeck(deck);
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
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
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
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },
    };
  }

  private async appendVirtualHomeDecksIfMissing(decks: any[], surface: HomeDeckSurface, locale?: string) {
    if (surface !== HomeDeckSurface.HOME) {
      return decks;
    }

    const missingDefinitions = VIRTUAL_HOME_DECKS.filter((definition) => !this.hasDeckCoverage(decks, definition));
    if (!missingDefinitions.length) {
      return decks;
    }

    const baseSortOrder = decks.reduce((max, deck) => Math.max(max, deck.sortOrder ?? 0), -1);
    const virtualDecks = await Promise.all(
      missingDefinitions.map((definition, index) =>
        this.buildVirtualHomeDeck(definition, baseSortOrder + index + 1, locale),
      ),
    );

    return [...decks, ...virtualDecks].sort((a, b) => (a.sortOrder - b.sortOrder) || a.slug.localeCompare(b.slug));
  }

  private hasDeckCoverage(decks: any[], definition: VirtualHomeDeckDefinition) {
    return decks.some((deck) => deck.slug === definition.slug || deck.ctaRoute === definition.ctaRoute);
  }

  private async buildVirtualHomeDeck(definition: VirtualHomeDeckDefinition, sortOrder: number, locale?: string) {
    const entities = await this.prisma.entity.findMany({
      where: {
        status: EntityStatus.PUBLISHED,
        slug: { in: definition.entitySlugs },
      },
      include: this.entityInclude(normalizeLocale(locale)),
    });

    const entitiesBySlug = new Map(entities.map((entity) => [entity.slug, entity]));
    const items = definition.entitySlugs
      .map((slug, index) => {
        const entity = entitiesBySlug.get(slug);
        if (!entity) {
          return null;
        }

        return {
          id: `virtual-${definition.slug}-${entity.id}`,
          sortOrder: index,
          entity,
        };
      })
      .filter(Boolean);

    return {
      id: `virtual-home-${definition.slug}`,
      slug: definition.slug,
      surface: HomeDeckSurface.HOME,
      title: definition.title,
      subtitle: definition.subtitle,
      description: definition.description,
      ctaLabel: definition.ctaLabel,
      ctaUrl: null,
      ctaRoute: definition.ctaRoute,
      imageUrl: definition.imageUrl,
      imageMediaId: null,
      imageMedia: null,
      sortOrder,
      isVirtual: true,
      translations: definition.translations,
      items,
    };
  }


  private resolveDeckTranslation(deck: any, requestedLocale?: string) {
    const locale = normalizeLocale(requestedLocale);
    const translations = deck.translations ?? [];
    const resolved = translations.find((item: any) => item.locale === locale)
      ?? translations.find((item: any) => item.locale === 'es')
      ?? translations.find((item: any) => item.locale === 'en')
      ?? null;

    return {
      title: resolved?.title?.trim() || deck.title,
      subtitle: resolved?.subtitle?.trim() || deck.subtitle,
      description: resolved?.description?.trim() || deck.description,
      ctaLabel: resolved?.ctaLabel?.trim() || deck.ctaLabel,
    };
  }

  private serializePublicDeck(deck: any, locale?: string) {
    const resolved = this.resolveDeckTranslation(deck, locale);

    return {
      id: deck.id,
      isVirtual: !!deck.isVirtual,
      surface: deck.surface,
      slug: deck.slug,
      title: resolved.title,
      subtitle: resolved.subtitle,
      description: resolved.description,
      ctaLabel: resolved.ctaLabel,
      ctaUrl: deck.ctaUrl,
      ctaRoute: deck.ctaRoute,
      image: this.serializeDeckImage(deck),
      sortOrder: deck.sortOrder,
      entities: this.serializeItems(deck.items, locale),
    };
  }

  private serializeAdminDeck(deck: any) {
    const serialized = {
      ...this.serializePublicDeck(deck),
      translations: this.serializeDeckTranslations(deck),
      imageUrl: normalizeStoredUploadUrl(deck.imageUrl),
      imageMediaId: deck.imageMediaId,
      isActive: deck.isActive,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      warnings: this.buildWarnings(deck),
    };

    return serialized;
  }

  private serializeItems(items: any[], locale?: string) {
    return (items ?? []).map((item) => {
      const localizedEntity = item.entity ? resolveEntityTranslation(item.entity, locale) : item.entity;

      return {
        id: item.id,
        sortOrder: item.sortOrder,
        entity: attachResolvedMedia(localizedEntity),
      };
    });
  }

  private serializeDeckImage(deck: any) {
    if (deck.imageMedia) {
      return {
        id: deck.imageMedia.id,
        url: normalizeStoredUploadUrl(deck.imageMedia.displayUrl ?? deck.imageMedia.url),
        width: deck.imageMedia.width ?? null,
        height: deck.imageMedia.height ?? null,
        alt: deck.imageMedia.alt ?? deck.title,
        source: deck.imageMedia.source ?? null,
      };
    }

    if (deck.imageUrl) {
      return {
        id: null,
        url: normalizeStoredUploadUrl(deck.imageUrl),
        width: null,
        height: null,
        alt: deck.title,
        source: null,
      };
    }

    return null;
  }


  private serializeDeckTranslations(deck: any) {
    return (deck.translations ?? [])
      .map((translation: any) => ({
        locale: translation.locale,
        title: translation.title,
        subtitle: translation.subtitle,
        description: translation.description,
        ctaLabel: translation.ctaLabel,
      }))
      .sort((a: any, b: any) => a.locale.localeCompare(b.locale));
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
      .map((item: any) => ({
        locale: normalizeLocale(item?.locale),
        title: item?.title?.trim(),
        subtitle: this.optionalTrim(item?.subtitle),
        description: this.optionalTrim(item?.description),
        ctaLabel: this.optionalTrim(item?.ctaLabel),
      }))
      .filter((item: any) => item.title);

    const hasSpanish = incoming.some((item: any) => item.locale === 'es');
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
    return buildPublicUploadUrl(storageKey, this.mediaPublicBaseUrl);
  }
}
