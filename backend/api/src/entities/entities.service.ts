import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';
import { ContentLevel, EntityStatus, MediaOriginType, MediaRole } from '@prisma/client';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { UpsertEntityTranslationDto } from './dto/upsert-entity-translation.dto';
import { CreateEntityAliasDto, type EntityAliasKindValue } from './dto/create-entity-alias.dto';
import { UpdateEntityAliasDto } from './dto/update-entity-alias.dto';
import { CreateEntityMediaDto } from './dto/create-entity-media.dto';
import { UpdateEntityMediaDto } from './dto/update-entity-media.dto';
import { UploadEntityMediaDto } from './dto/upload-entity-media.dto';
import { UpdateEntityDetailsDto } from './dto/update-entity-details.dto';
import { CreateSourceRefDto } from './dto/create-source-ref.dto';
import { UpdateSourceRefDto } from './dto/update-source-ref.dto';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { UpdateContributorDto } from './dto/update-contributor.dto';
import { attachResolvedMedia, buildAdminMediaLibrary, resolvedMediaUrl, type ResolvedMediaPayload } from './media.resolver';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { detectImageDimensionsFromBuffer } from './image-metadata';
import { normalizeLocale, resolveEntityTranslation, translationStatusSummary } from './entity-translation.resolver';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';

type GraphNodePayload = {
  id: string;
  label: string;
  type: string;
  slug: string;
  image: string | null;
  resolvedMedia?: ResolvedMediaPayload;
  metadata: {
    summary: string | null;
    startYear: number | null;
    endYear: number | null;
  };
};

type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

type GraphEdgePayload = {
  id: string;
  source: string;
  target: string;
  relationType: string;
  label: string;
  directed: boolean;
  weight: number;
  justification: string | null;
};

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

const DEFAULT_ENTITY_ALIAS_KIND: EntityAliasKindValue = 'COMMON_NAME';

type SlotCropInput = {
  explorer3d?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
  list?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
  detail?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
  preview?: { x?: number | null; y?: number | null; zoom?: number | null } | null;
} | null | undefined;

@Injectable()
export class EntitiesService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(process.env.MEDIA_PUBLIC_BASE_URL);

  private readonly HOME_TYPES: EntityType[] = [
    'ARTWORK',
    'ARTICLE',
    'PERIOD',
    'MOVEMENT',
    'CONCEPT',
    'ARTIST',
  ];

  constructor(private prisma: PrismaService) { }

  private withResolvedMedia<T extends { mediaLinks?: any[] | null }>(entity: T): T & { resolvedMedia: ResolvedMediaPayload } {
    return attachResolvedMedia(entity);
  }

  private resolveLocalizedEntity<T extends { title: string; summary?: string | null; content?: string | null; translations?: any[] | null; mediaLinks?: any[] | null }>(entity: T, locale?: string) {
    return this.withResolvedMedia(resolveEntityTranslation(entity, locale));
  }

  private resolveLocalizedDetail<T extends Record<string, any> | null | undefined>(detail: T, locale: string | undefined, fields: string[]): T {
    if (!detail) {
      return detail;
    }

    const requestedLocale = normalizeLocale(locale);
    const translations = Array.isArray((detail as any).translations) ? (detail as any).translations : [];
    const resolved = translations.find((item: any) => item?.locale === requestedLocale)
      ?? translations.find((item: any) => item?.locale === 'es')
      ?? translations.find((item: any) => item?.locale === 'en')
      ?? null;

    if (!resolved) {
      return detail;
    }

    const localized = { ...detail } as Record<string, any>;
    for (const field of fields) {
      const value = resolved?.[field];
      if (typeof value === 'string' && value.trim()) {
        localized[field] = value.trim();
      }
    }

    return localized as T;
  }

  private applyLocalizedTypedDetails<T extends { artwork?: any; artist?: any; concept?: any; period?: any }>(entity: T, locale?: string): T {
    return {
      ...entity,
      artwork: this.resolveLocalizedDetail(entity.artwork, locale, ['authorNation', 'technique', 'materials', 'dimensions', 'location', 'collection', 'state']),
      artist: this.resolveLocalizedDetail(entity.artist, locale, ['country', 'city', 'disciplines', 'bioShort', 'links']),
      concept: this.resolveLocalizedDetail(entity.concept, locale, ['definition']),
      period: this.resolveLocalizedDetail(entity.period, locale, ['definition']),
    };
  }

  private resolveLocalizedEntityWithDetails<T extends { title: string; summary?: string | null; content?: string | null; translations?: any[] | null; mediaLinks?: any[] | null; artwork?: any; artist?: any; concept?: any; period?: any }>(entity: T, locale?: string) {
    return this.applyLocalizedTypedDetails(this.resolveLocalizedEntity(entity, locale), locale);
  }

  private localizedInclude(locale?: string) {
    const requestedLocale = normalizeLocale(locale);
    return {
      where: { locale: { in: Array.from(new Set([requestedLocale, 'es', 'en'])) } },
    };
  }

  private translationField(record: { translations?: any[] | null } | null | undefined, locale: string | undefined, field: string): string | null {
    if (!record) {
      return null;
    }

    const requestedLocale = normalizeLocale(locale);
    const translations = Array.isArray(record.translations) ? record.translations : [];
    const resolved = translations.find((item: any) => item?.locale === requestedLocale)
      ?? translations.find((item: any) => item?.locale === 'es')
      ?? translations.find((item: any) => item?.locale === 'en')
      ?? null;

    const value = resolved?.[field];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private translationValueForLocale(record: { translations?: any[] | null } | null | undefined, field: string, locale: string): string | null {
    if (!record) {
      return null;
    }

    const translations = Array.isArray(record.translations) ? record.translations : [];
    const match = translations.find((item: any) => item?.locale === locale);
    const value = match?.[field];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeAliasLocale(rawLocale?: string | null): string {
    const trimmed = rawLocale?.trim().toLowerCase();
    if (!trimmed) {
      return 'und';
    }

    if (trimmed === 'und') {
      return 'und';
    }

    return normalizeLocale(trimmed);
  }

  private sanitizeAliasValue(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private relationLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATED_BY: 'Creado por',
      BELONGS_TO_MOVEMENT: 'Pertenece al movimiento',
      BELONGS_TO_PERIOD: 'Pertenece al periodo',
      ABOUT_CONCEPT: 'Explora el concepto',
      LOCATED_IN: 'Ubicado en',
      RELATED_TO: 'Relacionado con',
      MENTIONS: 'Menciona',
      ASSOCIATED_WITH: 'Asociado con',
      INSPIRED_BY: 'Inspirado por',
      INFLUENCED_BY: 'Influenciado por',
      PART_OF: 'Forma parte de',
      DEPICTS: 'Representa',
    };

    return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
  }

  private relationKey(relation: { type?: string | null; relationType?: { key?: string | null } | null }): string {
    const relationTypeKey = relation.relationType?.key?.trim();
    if (relationTypeKey) {
      return relationTypeKey;
    }

    const relationType = relation.type?.trim();
    if (relationType) {
      return relationType;
    }

    return 'RELATED_TO';
  }

  private relationDisplayLabel(relation: { type?: string | null; relationType?: { label?: string | null; key?: string | null; translations?: any[] | null } | null }, locale?: string): string {
    const requestedLocale = normalizeLocale(locale);
    const translation = relation.relationType?.translations?.find((item: any) => item.locale === requestedLocale)
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'es')
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'en')
      ?? null;

    return translation?.label?.trim() ?? relation.relationType?.label ?? this.relationLabel(this.relationKey(relation));
  }

  private relationInverseDisplayLabel(relation: { type?: string | null; relationType?: { inverseLabel?: string | null; key?: string | null; translations?: any[] | null } | null }, locale?: string): string {
    const requestedLocale = normalizeLocale(locale);
    const translation = relation.relationType?.translations?.find((item: any) => item.locale === requestedLocale)
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'es')
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'en')
      ?? null;

    return translation?.inverseLabel?.trim() ?? relation.relationType?.inverseLabel ?? this.relationLabel(this.relationKey(relation));
  }

  private isDirectedRelation(relation: { type?: string | null; relationType?: { key?: string | null; directed?: boolean | null } | null } | string): boolean {
    if (typeof relation !== 'string' && relation.relationType?.directed !== null && relation.relationType?.directed !== undefined) {
      return relation.relationType.directed;
    }

    const type = typeof relation === 'string' ? relation : this.relationKey(relation);
    return !['RELATED_TO', 'ASSOCIATED_WITH', 'SIMILAR_TO', 'CURATED_WITH'].includes(type);
  }

  private serializeRelation<T extends { type?: string | null; relationType?: any; justification?: string | null; translations?: any[] | null }>(relation: T, locale?: string): T & {
    relationTypeKey: string;
    relationTypeLabel: string;
    relationTypeInverseLabel: string;
    directed: boolean;
    justification: string | null;
    justificationEs: string | null;
    justificationEn: string | null;
  } {
    const key = this.relationKey(relation);

    return {
      ...relation,
      relationTypeKey: key,
      relationTypeLabel: this.relationDisplayLabel(relation, locale),
      relationTypeInverseLabel: this.relationInverseDisplayLabel(relation, locale),
      directed: this.isDirectedRelation(relation),
      justification: this.translationField(relation, locale, 'justification') ?? relation.justification ?? null,
      justificationEs: this.translationValueForLocale(relation, 'justification', 'es') ?? relation.justification ?? null,
      justificationEn: this.translationValueForLocale(relation, 'justification', 'en'),
    };
  }

  private serializeSource<T extends { title?: string | null; author?: string | null; publisher?: string | null; translations?: any[] | null }>(source: T | null | undefined, locale?: string) {
    if (!source) {
      return source;
    }

    return {
      ...source,
      title: this.translationField(source, locale, 'title') ?? source.title ?? null,
      author: this.translationField(source, locale, 'author') ?? source.author ?? null,
      publisher: this.translationField(source, locale, 'publisher') ?? source.publisher ?? null,
      titleEs: this.translationValueForLocale(source, 'title', 'es') ?? source.title ?? null,
      titleEn: this.translationValueForLocale(source, 'title', 'en'),
      authorEs: this.translationValueForLocale(source, 'author', 'es') ?? source.author ?? null,
      authorEn: this.translationValueForLocale(source, 'author', 'en'),
      publisherEs: this.translationValueForLocale(source, 'publisher', 'es') ?? source.publisher ?? null,
      publisherEn: this.translationValueForLocale(source, 'publisher', 'en'),
    };
  }

  private serializeSourceRef<T extends { quote?: string | null; note?: string | null; translations?: any[] | null }>(ref: T, locale?: string): T & {
    quote: string | null;
    note: string | null;
    quoteEs: string | null;
    quoteEn: string | null;
    noteEs: string | null;
    noteEn: string | null;
  } {
    return {
      ...ref,
      source: this.serializeSource((ref as any).source, locale),
      quote: this.translationField(ref, locale, 'quote') ?? ref.quote ?? null,
      note: this.translationField(ref, locale, 'note') ?? ref.note ?? null,
      quoteEs: this.translationValueForLocale(ref, 'quote', 'es') ?? ref.quote ?? null,
      quoteEn: this.translationValueForLocale(ref, 'quote', 'en'),
      noteEs: this.translationValueForLocale(ref, 'note', 'es') ?? ref.note ?? null,
      noteEn: this.translationValueForLocale(ref, 'note', 'en'),
    };
  }

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
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    if (ingestedMedia?.derivedFromMediaId) {
      const direct = candidates.find((candidate) => candidate.mediaId === ingestedMedia.derivedFromMediaId);
      if (direct) {
        return direct;
      }
    }

    const normalizedCanonical = this.normalizeUrlCandidate(canonicalUrl);
    if (!normalizedCanonical) {
      throw new BadRequestException('El asset INGESTED no conserva referencia suficiente al asset externo');
    }

    const match = candidates.find((candidate) =>
      this.mediaSourceCandidates(candidate.media).includes(normalizedCanonical),
    );

    if (!match) {
      throw new BadRequestException('No se encontró el asset externo origen dentro de esta entity');
    }

    return match;
  }

  private async findPromotedIngestedLinkForExternal(entityId: string, externalLinkId: string, externalMediaId: string) {
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
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    return candidates.find((candidate) => candidate.role !== MediaRole.GALLERY || candidate.isPrimary) ?? candidates[0] ?? null;
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

  private normalizeCropPreset(value: { x?: number | null; y?: number | null; zoom?: number | null } | null | undefined) {
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

  private slotCropColumns(input: SlotCropInput) {
    return {
      cropExplorer3d: this.normalizeCropPreset(input?.explorer3d),
      cropList: this.normalizeCropPreset(input?.list),
      cropDetail: this.normalizeCropPreset(input?.detail),
      cropPreview: this.normalizeCropPreset(input?.preview),
    };
  }

  private async clearOtherLegacyPrimaries(
    tx: { entityMedia: { updateMany: (args: any) => Promise<unknown> } },
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

  private async normalizeEntityLegacyPrimary(entityId: string) {
    const activeLegacyLinks = await this.prisma.entityMedia.findMany({
      where: {
        entityId,
        isPrimary: true,
      },
      select: {
        id: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    if (activeLegacyLinks.length <= 1) {
      return;
    }

    const [keep, ...extra] = activeLegacyLinks;
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

  async list(query: ListEntitiesQuery) {
    return this.listForVisibility(query, { publicOnly: true });
  }

  async adminList(query: ListEntitiesQuery) {
    return this.listForVisibility(query, { publicOnly: false });
  }

  private async listForVisibility(query: ListEntitiesQuery, options: { publicOnly: boolean }) {

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 24);

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 24;

    const skip = (safePage - 1) * safeLimit;

    const q = (query.q ?? '').trim();
    const status = (query.status ?? '').trim();
    const contentLevel = (query.contentLevel ?? '').trim();
    const movement = (query.movement ?? '').trim().toLowerCase();
    const period = (query.period ?? '').trim().toLowerCase();
    const supportsInstitution = query.type === 'ARTWORK';
    const institution = supportsInstitution ? (query.institution ?? '').trim() : '';
    const supportsNationality = query.type === 'ARTIST';
    const nationality = supportsNationality ? (query.nationality ?? '').trim() : '';
    const sort = (query.sort ?? 'recent').trim();
    const deck = (query.deck ?? '').trim();
    const tag = (query.tag ?? '').trim();
    const locale = normalizeLocale(query.locale);

    const where: any = {};
    const and: any[] = [];

    let deckEntityOrder: string[] = [];

    if (deck && deck !== 'undefined' && deck !== 'null') {
      const homeDeck = await this.prisma.homeDeck.findFirst({
        where: {
          OR: [
            { id: deck },
            { slug: deck },
          ],
          ...(options.publicOnly ? { isActive: true } : {}),
        },
        include: {
          items: {
            where: options.publicOnly
              ? {
                  entity: {
                    status: EntityStatus.PUBLISHED,
                  },
                }
              : undefined,
            orderBy: [
              { sortOrder: 'asc' },
              { id: 'asc' },
            ],
            select: {
              entityId: true,
            },
          },
        },
      });

      deckEntityOrder = homeDeck?.items.map((item) => item.entityId) ?? [];

      and.push({
        id: {
          in: deckEntityOrder,
        },
      });
    }

    if (query.type) where.type = query.type;

    if (options.publicOnly) {
      where.status = EntityStatus.PUBLISHED;
    } else if (status && Object.values(EntityStatus).includes(status as EntityStatus)) {
      where.status = status as EntityStatus;
    }

    if (contentLevel && Object.values(ContentLevel).includes(contentLevel as ContentLevel)) {
      where.contentLevel = contentLevel as ContentLevel;
    }

    const qValid = q && q !== 'undefined' && q !== 'null';

    if (qValid) {
      and.push({
        OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (movement && movement !== 'undefined' && movement !== 'null') {
      and.push({
        outgoing: {
          some: {
            type: {
              in: ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'],
            },
            to: {
              type: 'MOVEMENT',
              slug: movement,
            },
          },
        },
      });
    }

    if (period && period !== 'undefined' && period !== 'null') {
      and.push({
        outgoing: {
          some: {
            type: 'BELONGS_TO_PERIOD',
            to: {
              type: 'PERIOD',
              slug: period,
            },
          },
        },
      });
    }

    if (institution && institution !== 'undefined' && institution !== 'null') {
      and.push({
        artwork: {
          is: {
            location: {
              equals: institution,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (nationality && nationality !== 'undefined' && nationality !== 'null') {
      and.push({
        artist: {
          is: {
            country: {
              equals: nationality,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    if (tag && tag !== 'undefined' && tag !== 'null') {
      and.push({
        tags: {
          some: {
            tag: {
              slug: tag,
              isActive: true,
            },
          },
        },
      });
    }

    if (and.length) {
      where.AND = and;
    }

    const total = await this.prisma.entity.count({ where });

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const useRelevance = sort === 'relevance' && !!qValid;

    const orderBy =
      sort === 'title'
        ? { title: 'asc' as const }
        : { createdAt: 'desc' as const };

    const useCuratedOrder = deckEntityOrder.length > 0 && sort !== 'title' && !useRelevance;

    if (!useRelevance) {

      const items = await this.prisma.entity.findMany({
        where,
        skip: useCuratedOrder ? undefined : skip,
        take: useCuratedOrder ? undefined : safeLimit,
        orderBy: useCuratedOrder ? undefined : orderBy,
        include: {
          translations: this.localizedInclude(locale),
          tags: {
            include: { tag: true },
            orderBy: [{ tag: { label: 'asc' } }],
          },
          mediaLinks: {
            include: { media: true },
            orderBy: [
              { sortOrder: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      const orderedItems = useCuratedOrder
        ? items
            .sort((a, b) => deckEntityOrder.indexOf(a.id) - deckEntityOrder.indexOf(b.id))
            .slice(skip, skip + safeLimit)
        : items;

      return {
        items: orderedItems.map((item) => this.resolveLocalizedEntity(item, locale)),
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      };
    }

    const fetchSize = Math.min(500, Math.max(120, safePage * safeLimit * 5));

    const raw = await this.prisma.entity.findMany({
      where,
      take: fetchSize,
      orderBy: { createdAt: 'desc' },
      include: {
        translations: this.localizedInclude(locale),
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          include: { media: true },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });

    const needle = q.toLowerCase();

    const score = (e: any) => {

      const t = (e.title ?? '').toLowerCase();
      const s = (e.summary ?? '').toLowerCase();
      const c = (e.content ?? '').toLowerCase();

      let sc = 0;

      if (t.includes(needle)) sc += 6;
      if (t.startsWith(needle)) sc += 4;

      if (s.includes(needle)) sc += 2;

      if (c.includes(needle)) sc += 1;

      return sc;
    };

    const ranked = raw
      .map((e) => ({ e, sc: score(e) }))
      .sort((a, b) => {

        if (b.sc !== a.sc) return b.sc - a.sc;

        return (
          new Date(b.e.createdAt).getTime() -
          new Date(a.e.createdAt).getTime()
        );
      })
      .map((x) => x.e);

    const items = ranked
      .slice(skip, skip + safeLimit)
      .map((item) => this.resolveLocalizedEntity(item, locale));

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
  }

  async listInstitutions() {
    const rows = await this.prisma.artworkDetails.findMany({
      where: {
        location: {
          not: null,
        },
        entity: {
          status: EntityStatus.PUBLISHED,
          type: 'ARTWORK',
        },
      },
      select: {
        location: true,
      },
      distinct: ['location'],
      orderBy: {
        location: 'asc',
      },
    });

    return Array.from(
      new Set(
        rows
          .map((row) => row.location?.trim())
          .filter((value): value is string => !!value),
      ),
    ).sort((a, b) => a.localeCompare(b, 'es'));
  }

  async listNationalities() {
    const rows = await this.prisma.artistDetails.findMany({
      where: {
        country: {
          not: null,
        },
        entity: {
          status: EntityStatus.PUBLISHED,
          type: 'ARTIST',
        },
      },
      select: {
        country: true,
      },
      distinct: ['country'],
      orderBy: {
        country: 'asc',
      },
    });

    return Array.from(
      new Set(
        rows
          .map((row) => row.country?.trim())
          .filter((value): value is string => !!value),
      ),
    ).sort((a, b) => a.localeCompare(b, 'es'));
  }

  async home(locale?: string) {

    const results = await Promise.all(
      this.HOME_TYPES.map((type) =>
        this.prisma.entity.findFirst({
          where: {
            type,
            status: EntityStatus.PUBLISHED,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            translations: this.localizedInclude(locale),
            tags: {
              include: { tag: true },
              orderBy: [{ tag: { label: 'asc' } }],
            },
            mediaLinks: {
              include: { media: true },
              orderBy: [
                { sortOrder: 'asc' },
                { id: 'asc' },
              ],
            },
          },
        }),
      ),
    );

    return results.filter(Boolean).map((entity) => this.resolveLocalizedEntity(entity!, locale));
  }

  async getBySlug(slug: string, locale?: string) {

    const entity = await this.prisma.entity.findFirst({
      where: {
        slug,
        status: EntityStatus.PUBLISHED,
      },
      include: {
        translations: this.localizedInclude(locale),
        artwork: { include: { translations: this.localizedInclude(locale) } },
        artist: { include: { translations: this.localizedInclude(locale) } },
        concept: { include: { translations: this.localizedInclude(locale) } },
        period: { include: { translations: this.localizedInclude(locale) } },
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          include: { media: true },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        },
        contributors: true,
        sourceRefs: { include: { source: { include: { translations: this.localizedInclude(locale) } }, translations: this.localizedInclude(locale) } },
        outgoing: {
          where: {
            to: {
              status: EntityStatus.PUBLISHED,
            },
          },
          include: {
            relationType: { include: { translations: this.localizedInclude(locale) } },
            translations: this.localizedInclude(locale),
            to: {
              include: {
                translations: this.localizedInclude(locale),
                mediaLinks: {
                  include: { media: true },
                  orderBy: [
                    { sortOrder: 'asc' },
                    { id: 'asc' },
                  ],
                },
              },
            },
          },
        },
        incoming: {
          where: {
            from: {
              status: EntityStatus.PUBLISHED,
            },
          },
          include: {
            relationType: { include: { translations: this.localizedInclude(locale) } },
            translations: this.localizedInclude(locale),
            from: {
              include: {
                translations: this.localizedInclude(locale),
                mediaLinks: {
                  include: { media: true },
                  orderBy: [
                    { sortOrder: 'asc' },
                    { id: 'asc' },
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!entity) throw new NotFoundException('Entity not found');

    return {
      ...this.resolveLocalizedEntityWithDetails(entity, locale),
      sourceRefs: (entity.sourceRefs ?? []).map((ref: any) => this.serializeSourceRef(ref, locale)),
      outgoing: (entity.outgoing ?? []).map((relation: any) => ({
        ...this.serializeRelation(relation, locale),
        to: relation.to ? this.resolveLocalizedEntityWithDetails(relation.to, locale) : relation.to,
      })),
      incoming: (entity.incoming ?? []).map((relation: any) => ({
        ...this.serializeRelation(relation, locale),
        from: relation.from ? this.resolveLocalizedEntityWithDetails(relation.from, locale) : relation.from,
      })),
    };
  }

  async graphBySlug(slug: string, locale?: string) {
    const graphMediaInclude = {
      translations: this.localizedInclude(locale),
      mediaLinks: {
        include: { media: true },
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },
    };

    const center = await this.prisma.entity.findFirst({
      where: {
        slug,
        status: EntityStatus.PUBLISHED,
      },
      include: graphMediaInclude,
    });

    if (!center) throw new NotFoundException('Entity not found');

    const relations = await this.prisma.relation.findMany({
      where: {
        OR: [
          {
            fromId: center.id,
            to: {
              status: EntityStatus.PUBLISHED,
            },
          },
          {
            toId: center.id,
            from: {
              status: EntityStatus.PUBLISHED,
            },
          },
        ],
      },
      select: {
        id: true,
        fromId: true,
        toId: true,
        weight: true,
        justification: true,
        type: true,
        relationType: {
          select: {
            key: true,
            label: true,
            inverseLabel: true,
            directed: true,
            translations: this.localizedInclude(locale),
          },
        },
        translations: this.localizedInclude(locale),
      },
    });

    const relatedNodeIds = Array.from(
      new Set(
        relations.flatMap((relation) => [relation.fromId, relation.toId]),
      ),
    ).filter((id) => id !== center.id);

    const relatedNodes = relatedNodeIds.length
      ? await this.prisma.entity.findMany({
          where: {
            id: { in: relatedNodeIds },
            status: EntityStatus.PUBLISHED,
          },
          include: graphMediaInclude,
        })
      : [];

    const nodesMap = new Map<string, GraphNodePayload>();
    const entityMap = new Map<string, any>([
      [center.id, center],
      ...relatedNodes.map((node) => [node.id, node] as const),
    ]);

    const toNodePayload = (node: any): GraphNodePayload => {
      const resolvedNode = this.resolveLocalizedEntity(node, locale);
      const image =
        resolvedMediaUrl(resolvedNode.resolvedMedia.thumbnail)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.card)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.detail)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.hero)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.explorer3d)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.primary);

      return {
        id: node.id,
        label: resolvedNode.title,
        type: node.type,
        slug: node.slug,
        image: image ?? null,
        resolvedMedia: resolvedNode.resolvedMedia,
        metadata: {
          summary: resolvedNode.summary ?? null,
          startYear: node.startYear ?? null,
          endYear: node.endYear ?? null,
        },
      };
    };

    nodesMap.set(center.id, toNodePayload(center));

    for (const r of relations) {
      const fromNode = entityMap.get(r.fromId);
      const toNode = entityMap.get(r.toId);
      if (!fromNode || !toNode) {
        continue;
      }

      nodesMap.set(fromNode.id, toNodePayload(fromNode));
      nodesMap.set(toNode.id, toNodePayload(toNode));
    }

    const nodes = Array.from(nodesMap.values()).sort((a, b) => {
      if (a.id === center.id) return -1;
      if (b.id === center.id) return 1;
      return a.label.localeCompare(b.label, normalizeLocale(locale));
    });

    const edges: GraphEdgePayload[] = relations.map((r) => ({
      id: r.id,
      source: r.fromId,
      target: r.toId,
      relationType: this.relationKey(r),
      label: this.relationDisplayLabel(r, locale),
      directed: this.isDirectedRelation(r),
      weight: r.weight ?? 1,
      justification: this.translationField(r, locale, 'justification') ?? r.justification ?? null,
    }));

    const entityTypes = Array.from(new Set(nodes.map((node) => node.type))).sort();
    const relationTypes = Array.from(new Set(edges.map((edge) => edge.relationType))).sort();

    return {
      centerId: center.id,
      nodes,
      edges,
      filters: {
        entityTypes,
        relationTypes,
      },
    };
  }

  async previewBySlug(slug: string, locale?: string) {

    const e = await this.prisma.entity.findFirst({
      where: {
        slug,
        status: EntityStatus.PUBLISHED,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        summary: true,
        status: true,
        contentLevel: true,
        startYear: true,
        endYear: true,
        translations: this.localizedInclude(locale),
        tags: {
          select: {
            weight: true,
            source: true,
            tag: true,
          },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            role: true,
            sortOrder: true,
            isPrimary: true,
            displayMode: true,
            focalX: true,
            focalY: true,
            cropExplorer3d: true,
            cropList: true,
            cropDetail: true,
            cropPreview: true,
            media: {
              select: {
                id: true,
                url: true,
                originType: true,
                derivedFromMediaId: true,
                canonicalUrl: true,
                displayUrl: true,
                sourcePageUrl: true,
                storageKey: true,
                originalFilename: true,
                fileSize: true,
                mimeType: true,
                width: true,
                height: true,
                focalX: true,
                focalY: true,
                isVector: true,
                provider: true,
                qualityTier: true,
                alt: true,
                source: true,
                photoBy: true,
                license: true,
              },
            },
          },
        },
      },
    });

    if (!e) throw new NotFoundException('Entity not found');

    return {
      ...this.resolveLocalizedEntity(e, locale),
      mediaLibrary: buildAdminMediaLibrary(e),
    };
  }

  async adminCreate(dto: CreateEntityDto) {

    const existing = await this.prisma.entity.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const entity = await this.prisma.entity.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        summary: dto.summary?.trim(),
        content: dto.content?.trim(),
        contentLevel: dto.contentLevel,
        status: dto.status ?? 'DRAFT',
        startYear: dto.startYear,
        endYear: dto.endYear,
        translations: {
          create: {
            locale: 'es',
            title: dto.title.trim(),
            shortDescription: dto.summary?.trim() || null,
            essay: dto.content?.trim() || null,
            excerpt: dto.summary?.trim() || null,
          },
        },
      },
    });

    await this.syncContentRelations(entity.id, entity.content);

    return this.adminGetById(entity.id);
  }

  async adminUpdate(id: string, dto: UpdateEntityDto) {

    const existing = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Entity not found');
    }

    if (dto.slug) {

      const slugOwner = await this.prisma.entity.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });

      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException('Slug already exists');
      }
    }

    const entity = await this.prisma.entity.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title?.trim(),
        slug: dto.slug?.trim(),
        summary: dto.summary?.trim(),
        content: dto.content?.trim(),
        contentLevel: dto.contentLevel,
        status: dto.status,
        startYear: dto.startYear,
        endYear: dto.endYear,
      },
    });

    if (dto.title) {
      await this.prisma.entityTranslation.upsert({
        where: { entityId_locale: { entityId: entity.id, locale: 'es' } },
        create: {
          entityId: entity.id,
          locale: 'es',
          title: dto.title.trim(),
          shortDescription: dto.summary?.trim() || entity.summary || null,
          essay: dto.content?.trim() || entity.content || null,
          excerpt: dto.summary?.trim() || entity.summary || null,
        },
        update: {
          title: dto.title.trim(),
          shortDescription: dto.summary?.trim() || entity.summary || null,
          essay: dto.content?.trim() || entity.content || null,
          excerpt: dto.summary?.trim() || entity.summary || null,
        },
      });
    }

    await this.syncContentRelations(entity.id, entity.content);

    return this.adminGetById(entity.id);
  }

  async adminDelete(id: string) {

    const existing = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Entity not found');
    }

    const sourceRefs = await this.prisma.sourceRef.findMany({
      where: { entityId: id },
      select: { sourceId: true },
    });

    const orphanCandidateSourceIds = [...new Set(sourceRefs.map((ref) => ref.sourceId).filter(Boolean))];

    await this.prisma.$transaction(async (tx) => {
      await tx.relation.deleteMany({
        where: {
          OR: [
            { fromId: id },
            { toId: id },
          ],
        },
      });

      await tx.entityMedia.deleteMany({ where: { entityId: id } });
      await tx.sourceRef.deleteMany({ where: { entityId: id } });
      await tx.contributor.deleteMany({ where: { entityId: id } });
      await tx.curatorNote.deleteMany({ where: { entityId: id } });
      await tx.entityTag.deleteMany({ where: { entityId: id } });
      await (tx as any).entityAlias.deleteMany({ where: { entityId: id } });
      await tx.homeDeckItem.deleteMany({ where: { entityId: id } });
      await tx.collectionEntity.deleteMany({ where: { entityId: id } });
      await tx.savedEntity.deleteMany({ where: { entityId: id } });
      await tx.artworkDetails.deleteMany({ where: { entityId: id } });
      await tx.artistDetails.deleteMany({ where: { entityId: id } });
      await tx.conceptDetails.deleteMany({ where: { entityId: id } });
      await tx.periodDetails.deleteMany({ where: { entityId: id } });

      await tx.entity.delete({
        where: { id },
      });

      if (orphanCandidateSourceIds.length) {
        await tx.source.deleteMany({
          where: {
            id: { in: orphanCandidateSourceIds },
            refs: {
              none: {},
            },
          },
        });
      }
    });

    return { ok: true };
  }

  private async upsertBaseDetails(id: string, entityType: string, dto: UpdateEntityDetailsDto) {
    switch (entityType) {
      case 'ARTWORK':
        await this.prisma.artworkDetails.upsert({
          where: { entityId: id },
          update: {
            authorNation: dto.authorNation?.trim() || null,
            technique: dto.technique?.trim() || null,
            materials: dto.materials?.trim() || null,
            dimensions: dto.dimensions?.trim() || null,
            location: dto.location?.trim() || null,
            collection: dto.collection?.trim() || null,
            state: dto.state?.trim() || null,
          },
          create: {
            entityId: id,
            authorNation: dto.authorNation?.trim() || null,
            technique: dto.technique?.trim() || null,
            materials: dto.materials?.trim() || null,
            dimensions: dto.dimensions?.trim() || null,
            location: dto.location?.trim() || null,
            collection: dto.collection?.trim() || null,
            state: dto.state?.trim() || null,
          },
        });
        return;
      case 'ARTIST':
        await this.prisma.artistDetails.upsert({
          where: { entityId: id },
          update: {
            country: dto.country?.trim() || null,
            city: dto.city?.trim() || null,
            birthYear: dto.birthYear ?? null,
            deathYear: dto.deathYear ?? null,
            disciplines: dto.disciplines?.trim() || null,
            bioShort: dto.bioShort?.trim() || null,
            links: dto.links?.trim() || null,
          },
          create: {
            entityId: id,
            country: dto.country?.trim() || null,
            city: dto.city?.trim() || null,
            birthYear: dto.birthYear ?? null,
            deathYear: dto.deathYear ?? null,
            disciplines: dto.disciplines?.trim() || null,
            bioShort: dto.bioShort?.trim() || null,
            links: dto.links?.trim() || null,
          },
        });
        return;
      case 'CONCEPT':
        await this.prisma.conceptDetails.upsert({
          where: { entityId: id },
          update: { definition: dto.definition?.trim() || null },
          create: { entityId: id, definition: dto.definition?.trim() || null },
        });
        return;
      case 'PERIOD':
        await this.prisma.periodDetails.upsert({
          where: { entityId: id },
          update: { definition: dto.definition?.trim() || null },
          create: { entityId: id, definition: dto.definition?.trim() || null },
        });
        return;
      default:
        return;
    }
  }

  private async upsertTranslatedDetails(id: string, entityType: string, locale: string, dto: UpdateEntityDetailsDto) {
    switch (entityType) {
      case 'ARTWORK':
        await this.prisma.artworkDetailsTranslation.upsert({
          where: { entityId_locale: { entityId: id, locale } },
          update: {
            authorNation: dto.authorNation?.trim() || null,
            technique: dto.technique?.trim() || null,
            materials: dto.materials?.trim() || null,
            dimensions: dto.dimensions?.trim() || null,
            location: dto.location?.trim() || null,
            collection: dto.collection?.trim() || null,
            state: dto.state?.trim() || null,
          },
          create: {
            entityId: id,
            locale,
            authorNation: dto.authorNation?.trim() || null,
            technique: dto.technique?.trim() || null,
            materials: dto.materials?.trim() || null,
            dimensions: dto.dimensions?.trim() || null,
            location: dto.location?.trim() || null,
            collection: dto.collection?.trim() || null,
            state: dto.state?.trim() || null,
          },
        });
        return;
      case 'ARTIST':
        await this.prisma.artistDetailsTranslation.upsert({
          where: { entityId_locale: { entityId: id, locale } },
          update: {
            country: dto.country?.trim() || null,
            city: dto.city?.trim() || null,
            disciplines: dto.disciplines?.trim() || null,
            bioShort: dto.bioShort?.trim() || null,
            links: dto.links?.trim() || null,
          },
          create: {
            entityId: id,
            locale,
            country: dto.country?.trim() || null,
            city: dto.city?.trim() || null,
            disciplines: dto.disciplines?.trim() || null,
            bioShort: dto.bioShort?.trim() || null,
            links: dto.links?.trim() || null,
          },
        });
        return;
      case 'CONCEPT':
        await this.prisma.conceptDetailsTranslation.upsert({
          where: { entityId_locale: { entityId: id, locale } },
          update: { definition: dto.definition?.trim() || null },
          create: { entityId: id, locale, definition: dto.definition?.trim() || null },
        });
        return;
      case 'PERIOD':
        await this.prisma.periodDetailsTranslation.upsert({
          where: { entityId_locale: { entityId: id, locale } },
          update: { definition: dto.definition?.trim() || null },
          create: { entityId: id, locale, definition: dto.definition?.trim() || null },
        });
        return;
      default:
        return;
    }
  }

  private async upsertRelationTranslations(relationId: string, dto: { justification?: string; justificationEs?: string; justificationEn?: string }) {
    const justificationEs = dto.justificationEs !== undefined ? (dto.justificationEs?.trim() || null) : (dto.justification?.trim() || null);
    const justificationEn = dto.justificationEn !== undefined ? (dto.justificationEn?.trim() || null) : null;

    await this.prisma.relationTranslation.upsert({
      where: { relationId_locale: { relationId, locale: 'es' } },
      update: { justification: justificationEs },
      create: { relationId, locale: 'es', justification: justificationEs },
    });

    await this.prisma.relationTranslation.upsert({
      where: { relationId_locale: { relationId, locale: 'en' } },
      update: { justification: justificationEn },
      create: { relationId, locale: 'en', justification: justificationEn },
    });
  }

  private async upsertSourceTranslations(sourceId: string, dto: { sourceTitle: string; sourceTitleEs?: string; sourceTitleEn?: string; sourceAuthor?: string; sourceAuthorEs?: string; sourceAuthorEn?: string; sourcePublisher?: string; sourcePublisherEs?: string; sourcePublisherEn?: string }) {
    const titleEs = dto.sourceTitleEs !== undefined ? (dto.sourceTitleEs?.trim() || null) : (dto.sourceTitle?.trim() || null);
    const titleEn = dto.sourceTitleEn !== undefined ? (dto.sourceTitleEn?.trim() || null) : null;
    const authorEs = dto.sourceAuthorEs !== undefined ? (dto.sourceAuthorEs?.trim() || null) : (dto.sourceAuthor?.trim() || null);
    const authorEn = dto.sourceAuthorEn !== undefined ? (dto.sourceAuthorEn?.trim() || null) : null;
    const publisherEs = dto.sourcePublisherEs !== undefined ? (dto.sourcePublisherEs?.trim() || null) : (dto.sourcePublisher?.trim() || null);
    const publisherEn = dto.sourcePublisherEn !== undefined ? (dto.sourcePublisherEn?.trim() || null) : null;

    await this.prisma.sourceTranslation.upsert({
      where: { sourceId_locale: { sourceId, locale: 'es' } },
      update: { title: titleEs ?? '', author: authorEs, publisher: publisherEs },
      create: { sourceId, locale: 'es', title: titleEs ?? '', author: authorEs, publisher: publisherEs },
    });

    await this.prisma.sourceTranslation.upsert({
      where: { sourceId_locale: { sourceId, locale: 'en' } },
      update: { title: titleEn ?? (titleEs ?? ''), author: authorEn, publisher: publisherEn },
      create: { sourceId, locale: 'en', title: titleEn ?? (titleEs ?? ''), author: authorEn, publisher: publisherEn },
    });
  }

  private async upsertSourceRefTranslations(sourceRefId: string, dto: { quote?: string; quoteEs?: string; quoteEn?: string; note?: string; noteEs?: string; noteEn?: string }) {
    const quoteEs = dto.quoteEs !== undefined ? (dto.quoteEs?.trim() || null) : (dto.quote?.trim() || null);
    const quoteEn = dto.quoteEn !== undefined ? (dto.quoteEn?.trim() || null) : null;
    const noteEs = dto.noteEs !== undefined ? (dto.noteEs?.trim() || null) : (dto.note?.trim() || null);
    const noteEn = dto.noteEn !== undefined ? (dto.noteEn?.trim() || null) : null;

    await this.prisma.sourceRefTranslation.upsert({
      where: { sourceRefId_locale: { sourceRefId, locale: 'es' } },
      update: { quote: quoteEs, note: noteEs },
      create: { sourceRefId, locale: 'es', quote: quoteEs, note: noteEs },
    });

    await this.prisma.sourceRefTranslation.upsert({
      where: { sourceRefId_locale: { sourceRefId, locale: 'en' } },
      update: { quote: quoteEn, note: noteEn },
      create: { sourceRefId, locale: 'en', quote: quoteEn, note: noteEn },
    });
  }

  async adminGetById(id: string) {
    await this.normalizeEntityLegacyPrimary(id);

    const entity = await (this.prisma as any).entity.findUnique({
      where: { id },
      include: {
        translations: { orderBy: { locale: 'asc' } },
        aliases: {
          orderBy: [
            { locale: 'asc' },
            { kind: 'asc' },
            { value: 'asc' },
          ],
        },
        artwork: { include: { translations: { orderBy: { locale: 'asc' } } } },
        artist: { include: { translations: { orderBy: { locale: 'asc' } } } },
        concept: { include: { translations: { orderBy: { locale: 'asc' } } } },
        period: { include: { translations: { orderBy: { locale: 'asc' } } } },
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          include: {
            media: true,
          },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        },
        contributors: {
          orderBy: [
            { role: 'asc' },
            { id: 'asc' },
          ],
        },
        sourceRefs: {
          include: { source: { include: { translations: { orderBy: { locale: 'asc' } } } }, translations: { orderBy: { locale: 'asc' } } },
          orderBy: [
            { id: 'asc' },
          ],
        },
        outgoing: {
          include: {
            relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
            translations: { orderBy: { locale: 'asc' } },
            to: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                summary: true,
              },
            },
          },
          orderBy: [
            { type: 'asc' },
            { id: 'asc' },
          ],
        },
        incoming: {
          include: {
            relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
            translations: { orderBy: { locale: 'asc' } },
            from: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                summary: true,
              },
            },
          },
          orderBy: [
            { type: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    }) as any;

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const resolvedEntity = this.withResolvedMedia(entity);

    return {
      ...entity,
      outgoing: (entity.outgoing ?? []).map((relation: any) => this.serializeRelation(relation)),
      incoming: (entity.incoming ?? []).map((relation: any) => this.serializeRelation(relation)),
      resolvedMedia: resolvedEntity.resolvedMedia,
      mediaLibrary: buildAdminMediaLibrary(entity),
      translationStatus: translationStatusSummary((entity as any).translations),
    };
  }

  async adminUpsertTranslation(id: string, rawLocale: string, dto: UpsertEntityTranslationDto) {
    const locale = normalizeLocale(rawLocale);
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const title = dto.title?.trim();
    if (!title) {
      throw new BadRequestException('Translation title is required');
    }

    await this.prisma.entityTranslation.upsert({
      where: {
        entityId_locale: {
          entityId: id,
          locale,
        },
      },
      create: {
        entityId: id,
        locale,
        title,
        shortDescription: dto.shortDescription?.trim() || null,
        essay: dto.essay?.trim() || null,
        notes: dto.notes?.trim() || null,
        excerpt: dto.excerpt?.trim() || null,
      },
      update: {
        title,
        shortDescription: dto.shortDescription?.trim() || null,
        essay: dto.essay?.trim() || null,
        notes: dto.notes?.trim() || null,
        excerpt: dto.excerpt?.trim() || null,
      },
    });

    if (dto.details) {
      await this.upsertTranslatedDetails(id, entity.type, locale, dto.details);
    }

    if (locale === 'es') {
      await this.prisma.entity.update({
        where: { id },
        data: {
          title,
          summary: dto.shortDescription?.trim() || dto.excerpt?.trim() || null,
          content: dto.essay?.trim() || null,
        },
      });

      if (dto.details) {
        await this.upsertBaseDetails(id, entity.type, dto.details);
      }
    }

    return this.adminGetById(id);
  }

  async adminCreateAlias(id: string, dto: CreateEntityAliasDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const value = this.sanitizeAliasValue(dto.value);
    if (!value) {
      throw new BadRequestException('Alias value is required');
    }

    try {
      await (this.prisma as any).entityAlias.create({
        data: {
          entityId: id,
          locale: this.normalizeAliasLocale(dto.locale),
          value,
          kind: dto.kind ?? DEFAULT_ENTITY_ALIAS_KIND,
          weight: dto.weight ?? null,
          source: dto.source?.trim() || null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Alias already exists for this entity');
      }

      throw error;
    }

    return this.adminGetById(id);
  }

  async adminUpdateAlias(entityId: string, aliasId: string, dto: UpdateEntityAliasDto) {
    const alias = await (this.prisma as any).entityAlias.findUnique({
      where: { id: aliasId },
      select: { id: true, entityId: true, value: true, locale: true, kind: true },
    });

    if (!alias || alias.entityId !== entityId) {
      throw new NotFoundException('Alias not found');
    }

    const nextValue = dto.value !== undefined ? this.sanitizeAliasValue(dto.value) : alias.value;
    if (!nextValue) {
      throw new BadRequestException('Alias value is required');
    }

    try {
      await (this.prisma as any).entityAlias.update({
        where: { id: aliasId },
        data: {
          value: nextValue,
          locale: dto.locale !== undefined ? this.normalizeAliasLocale(dto.locale) : alias.locale,
          kind: dto.kind ?? alias.kind,
          weight: dto.weight !== undefined ? dto.weight ?? null : undefined,
          source: dto.source !== undefined ? dto.source?.trim() || null : undefined,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Alias already exists for this entity');
      }

      throw error;
    }

    return this.adminGetById(entityId);
  }

  async adminDeleteAlias(entityId: string, aliasId: string) {
    const alias = await (this.prisma as any).entityAlias.findUnique({
      where: { id: aliasId },
      select: { id: true, entityId: true },
    });

    if (!alias || alias.entityId !== entityId) {
      throw new NotFoundException('Alias not found');
    }

    await (this.prisma as any).entityAlias.delete({
      where: { id: aliasId },
    });

    return this.adminGetById(entityId);
  }

  async adminUpdateDetails(id: string, dto: UpdateEntityDetailsDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    await this.upsertBaseDetails(id, entity.type, dto);
    return this.adminGetById(id);
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
        } as any,
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
        } as any,
        include: {
          media: true,
        },
      });

      if (dto.isPrimary) {
        await this.clearOtherLegacyPrimaries(tx as any, entityId, createdLink.id);
      }

      return createdLink;
    });
  }

  async adminUploadMedia(entityId: string, file: UploadedImageFile | undefined, dto: UploadEntityMediaDto) {

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
        } as any,
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
        } as any,
        include: {
          media: true,
        },
      });

      if (dto.isPrimary) {
        await this.clearOtherLegacyPrimaries(tx as any, entityId, createdLink.id);
      }

      return createdLink;
    });
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
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
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
      throw new BadRequestException('La media externa supera el tamaño máximo permitido para ingestión');
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
      const sourceReference = link.media.canonicalUrl?.trim()
        || link.media.displayUrl?.trim()
        || link.media.url?.trim()
        || sourceUrl;

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
        await this.clearOtherLegacyPrimaries(tx as any, entityId, linkId);
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
      throw new BadRequestException('No hay un asset INGESTED promovido que restaurar para este externo');
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
        await this.clearOtherLegacyPrimaries(tx as any, entityId, linkId);
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
      link.media.originType !== MediaOriginType.EXTERNAL_URL
      && (
        (dto.url !== undefined && dto.url.trim() !== link.media.url)
        || (dto.displayUrl !== undefined && (dto.displayUrl?.trim() || null) !== (link.media.displayUrl ?? null))
      )
    ) {
      throw new BadRequestException('No se puede editar manualmente URL o display URL en assets locales');
    }

    const mediaData = {
      url: dto.url?.trim(),
      displayUrl: dto.displayUrl !== undefined ? (dto.displayUrl?.trim() || null) : undefined,
      sourcePageUrl: dto.sourcePageUrl !== undefined ? (dto.sourcePageUrl?.trim() || null) : undefined,
      alt: dto.alt !== undefined ? (dto.alt?.trim() || null) : undefined,
      source: dto.source !== undefined ? (dto.source?.trim() || null) : undefined,
      photoBy: dto.photoBy !== undefined ? (dto.photoBy?.trim() || null) : undefined,
      license: dto.license !== undefined ? (dto.license?.trim() || null) : undefined,
      focalX: dto.assetFocalX === undefined ? undefined : this.normalizePercent(dto.assetFocalX),
      focalY: dto.assetFocalY === undefined ? undefined : this.normalizePercent(dto.assetFocalY),
    };

    const linkData = {
      role: dto.role,
      sortOrder: dto.sortOrder,
      isPrimary: dto.isPrimary,
      displayMode: dto.displayMode === undefined
        ? undefined
        : dto.displayMode ?? null,
      focalX: dto.focalX === undefined ? undefined : dto.focalX ?? null,
      focalY: dto.focalY === undefined ? undefined : dto.focalY ?? null,
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
          data: linkData as any,
        });

        if (dto.isPrimary === true) {
          await this.clearOtherLegacyPrimaries(tx as any, entityId, linkId);
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

  async adminListRelations(entityId: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const rows = await this.prisma.relation.findMany({
      where: { fromId: entityId },
      orderBy: { type: 'asc' },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    return rows.map((relation) => this.serializeRelation(relation, 'es'));
  }

  async adminCreateRelation(entityId: string, dto: any) {

    const from = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!from) {
      throw new NotFoundException('Origin entity not found');
    }

    const to = await this.prisma.entity.findUnique({
      where: { id: dto.toId },
      select: { id: true },
    });

    if (!to) {
      throw new NotFoundException('Target entity not found');
    }

    const relationType = dto.relationTypeId
      ? await this.prisma.relationType.findUnique({
        where: { id: dto.relationTypeId },
      })
      : dto.type
        ? await this.prisma.relationType.findUnique({
          where: { key: dto.type.trim() },
        })
        : null;

    const type = relationType?.key ?? dto.type?.trim();
    if (!type) {
      throw new BadRequestException('Relation type is required');
    }

    const relation = await this.prisma.relation.create({
      data: {
        fromId: entityId,
        toId: dto.toId,
        type,
        relationTypeId: relationType?.id,
        justification: dto.justificationEs?.trim() || dto.justification?.trim() || undefined,
        weight: dto.weight,
      },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    await this.upsertRelationTranslations(relation.id, dto);

    const persisted = await this.prisma.relation.findUniqueOrThrow({
      where: { id: relation.id },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: { select: { id: true, title: true, slug: true, type: true } },
      },
    });

    return this.serializeRelation(persisted, 'es');
  }

  async adminUpdateRelation(entityId: string, relationId: string, dto: any) {
    const existing = await this.prisma.relation.findFirst({
      where: { id: relationId, fromId: entityId },
      include: { relationType: true },
    });

    if (!existing) {
      throw new NotFoundException('Relation not found');
    }

    const relationType = dto.relationTypeId
      ? await this.prisma.relationType.findUnique({ where: { id: dto.relationTypeId } })
      : dto.type
        ? await this.prisma.relationType.findUnique({ where: { key: dto.type.trim() } })
        : existing.relationType;

    const persisted = await this.prisma.relation.update({
      where: { id: relationId },
      data: {
        type: relationType?.key ?? dto.type?.trim() ?? existing.type,
        relationTypeId: relationType?.id ?? existing.relationTypeId ?? undefined,
        justification: dto.justificationEs !== undefined || dto.justification !== undefined
          ? (dto.justificationEs?.trim() || dto.justification?.trim() || null)
          : undefined,
        weight: dto.weight !== undefined ? dto.weight : undefined,
      },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: { select: { id: true, title: true, slug: true, type: true } },
      },
    });

    await this.upsertRelationTranslations(relationId, dto);

    const refreshed = await this.prisma.relation.findUniqueOrThrow({
      where: { id: relationId },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: { select: { id: true, title: true, slug: true, type: true } },
      },
    });

    return this.serializeRelation(refreshed, 'es');
  }

  async adminDeleteRelation(entityId: string, relationId: string) {

    const relation = await this.prisma.relation.findFirst({
      where: {
        id: relationId,
        fromId: entityId,
      },
      select: { id: true },
    });

    if (!relation) {
      throw new NotFoundException('Relation not found');
    }

    await this.prisma.relation.delete({
      where: { id: relationId },
    });

    return { ok: true };
  }

  async adminListIncomingRelations(entityId: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const rows = await this.prisma.relation.findMany({
      where: { toId: entityId },
      orderBy: { type: 'asc' },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        from: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    return rows.map((relation) => this.serializeRelation(relation, 'es'));
  }

  async adminAddTag(entityId: string, dto: { tagId: string; weight?: number; source?: string }) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const tag = await this.prisma.tag.findUnique({
      where: { id: dto.tagId },
      select: { id: true },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.entityTag.upsert({
      where: {
        entityId_tagId: {
          entityId,
          tagId: dto.tagId,
        },
      },
      update: {
        weight: dto.weight ?? null,
        source: dto.source?.trim() || 'MANUAL',
      },
      create: {
        entityId,
        tagId: dto.tagId,
        weight: dto.weight ?? null,
        source: dto.source?.trim() || 'MANUAL',
      },
      include: {
        tag: true,
      },
    });
  }

  async adminRemoveTag(entityId: string, tagId: string) {
    const existing = await this.prisma.entityTag.findUnique({
      where: {
        entityId_tagId: {
          entityId,
          tagId,
        },
      },
      select: {
        entityId: true,
        tagId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Entity tag not found');
    }

    await this.prisma.entityTag.delete({
      where: {
        entityId_tagId: {
          entityId,
          tagId,
        },
      },
    });

    return { ok: true };
  }

  async adminCreateSourceRef(entityId: string, dto: CreateSourceRefDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const source = await this.prisma.source.create({
      data: {
        type: dto.sourceType,
        title: dto.sourceTitleEs?.trim() || dto.sourceTitle.trim(),
        author: dto.sourceAuthorEs?.trim() || dto.sourceAuthor?.trim() || null,
        publisher: dto.sourcePublisherEs?.trim() || dto.sourcePublisher?.trim() || null,
        year: dto.sourceYear ?? null,
        url: dto.sourceUrl?.trim() || null,
      },
    });

    await this.upsertSourceTranslations(source.id, dto);

    const ref = await this.prisma.sourceRef.create({
      data: {
        entityId,
        sourceId: source.id,
        page: dto.page?.trim() || null,
        quote: dto.quoteEs?.trim() || dto.quote?.trim() || null,
        note: dto.noteEs?.trim() || dto.note?.trim() || null,
      },
      include: {
        source: true,
        translations: { orderBy: { locale: 'asc' } },
      },
    });

    await this.upsertSourceRefTranslations(ref.id, dto);

    const persisted = await this.prisma.sourceRef.findUniqueOrThrow({
      where: { id: ref.id },
      include: { source: { include: { translations: { orderBy: { locale: 'asc' } } } }, translations: { orderBy: { locale: 'asc' } } },
    });

    return this.serializeSourceRef(persisted, 'es');
  }

  async adminUpdateSourceRef(entityId: string, refId: string, dto: UpdateSourceRefDto) {
    const existing = await this.prisma.sourceRef.findFirst({
      where: {
        id: refId,
        entityId,
      },
      include: {
        source: true,
        translations: { orderBy: { locale: 'asc' } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Source reference not found');
    }

    await this.prisma.source.update({
      where: { id: existing.sourceId },
      data: {
        type: dto.sourceType ?? undefined,
        title: dto.sourceTitleEs !== undefined || dto.sourceTitle !== undefined ? (dto.sourceTitleEs?.trim() || dto.sourceTitle?.trim() || existing.source.title) : undefined,
        author: dto.sourceAuthorEs !== undefined || dto.sourceAuthor !== undefined ? (dto.sourceAuthorEs?.trim() || dto.sourceAuthor?.trim() || null) : undefined,
        publisher: dto.sourcePublisherEs !== undefined || dto.sourcePublisher !== undefined ? (dto.sourcePublisherEs?.trim() || dto.sourcePublisher?.trim() || null) : undefined,
        year: dto.sourceYear !== undefined ? (dto.sourceYear ?? null) : undefined,
        url: dto.sourceUrl !== undefined ? (dto.sourceUrl?.trim() || null) : undefined,
      },
    });

    await this.upsertSourceTranslations(existing.sourceId, dto as any);

    await this.prisma.sourceRef.update({
      where: { id: refId },
      data: {
        page: dto.page !== undefined ? (dto.page?.trim() || null) : undefined,
        quote: dto.quoteEs !== undefined || dto.quote !== undefined ? (dto.quoteEs?.trim() || dto.quote?.trim() || null) : undefined,
        note: dto.noteEs !== undefined || dto.note !== undefined ? (dto.noteEs?.trim() || dto.note?.trim() || null) : undefined,
      },
    });

    await this.upsertSourceRefTranslations(refId, dto);

    const refreshed = await this.prisma.sourceRef.findUniqueOrThrow({
      where: { id: refId },
      include: { source: { include: { translations: { orderBy: { locale: 'asc' } } } }, translations: { orderBy: { locale: 'asc' } } },
    });

    return this.serializeSourceRef(refreshed, 'es');
  }

  async adminDeleteSourceRef(entityId: string, refId: string) {
    const existing = await this.prisma.sourceRef.findFirst({
      where: {
        id: refId,
        entityId,
      },
      select: {
        id: true,
        sourceId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Source reference not found');
    }

    await this.prisma.sourceRef.delete({
      where: { id: refId },
    });

    const remaining = await this.prisma.sourceRef.count({
      where: { sourceId: existing.sourceId },
    });

    if (remaining === 0) {
      await this.prisma.source.delete({
        where: { id: existing.sourceId },
      });
    }

    return { ok: true };
  }

  async adminCreateContributor(entityId: string, dto: CreateContributorDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.contributor.create({
      data: {
        entityId,
        name: dto.name.trim(),
        role: dto.role.trim(),
        note: dto.note?.trim() || null,
      },
    });
  }

  async adminUpdateContributor(entityId: string, contributorId: string, dto: UpdateContributorDto) {
    const existing = await this.prisma.contributor.findFirst({
      where: {
        id: contributorId,
        entityId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Contributor not found');
    }

    return this.prisma.contributor.update({
      where: { id: contributorId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        role: dto.role !== undefined ? dto.role.trim() : undefined,
        note: dto.note !== undefined ? (dto.note?.trim() || null) : undefined,
      },
    });
  }

  async adminDeleteContributor(entityId: string, contributorId: string) {
    const existing = await this.prisma.contributor.findFirst({
      where: {
        id: contributorId,
        entityId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Contributor not found');
    }

    await this.prisma.contributor.delete({
      where: { id: contributorId },
    });

    return { ok: true };
  }

  private extractEntityLinks(content: string | null | undefined): string[] {
    if (!content) return [];

    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

    const slugs: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const slug = (match[1] ?? '').trim();
      if (slug) slugs.push(slug);
    }

    return [...new Set(slugs)];
  }

  private async syncContentRelations(entityId: string, content: string | null) {
    const slugs = this.extractEntityLinks(content);

    const targets = slugs.length
      ? await this.prisma.entity.findMany({
        where: {
          slug: {
            in: slugs,
          },
          id: {
            not: entityId,
          },
        },
        select: {
          id: true,
          slug: true,
        },
      })
      : [];

    const targetIds = new Set(targets.map((t) => t.id));

    const existingMentions = await this.prisma.relation.findMany({
      where: {
        fromId: entityId,
        type: 'MENTIONS',
      },
      select: {
        id: true,
        toId: true,
      },
    });

    const existingTargetIds = new Set(existingMentions.map((r) => r.toId));
    const mentionsRelationType = await this.prisma.relationType.findUnique({
      where: { key: 'MENTIONS' },
      select: { id: true },
    });

    // Crear nuevas relaciones que no existían
    for (const target of targets) {
      if (!existingTargetIds.has(target.id)) {
        await this.prisma.relation.create({
          data: {
            fromId: entityId,
            toId: target.id,
            type: 'MENTIONS',
            relationTypeId: mentionsRelationType?.id,
          },
        });
      }
    }

    // Eliminar relaciones antiguas que ya no están en el contenido
    for (const relation of existingMentions) {
      if (!targetIds.has(relation.toId)) {
        await this.prisma.relation.delete({
          where: {
            id: relation.id,
          },
        });
      }
    }
  }
}
