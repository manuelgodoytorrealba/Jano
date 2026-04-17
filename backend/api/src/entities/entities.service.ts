import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';
import { ContentLevel, EntityStatus, MediaOriginType, MediaRole } from '@prisma/client';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateEntityMediaDto } from './dto/create-entity-media.dto';
import { UpdateEntityMediaDto } from './dto/update-entity-media.dto';
import { UploadEntityMediaDto } from './dto/upload-entity-media.dto';
import { UpdateEntityDetailsDto } from './dto/update-entity-details.dto';
import { CreateSourceRefDto } from './dto/create-source-ref.dto';
import { UpdateSourceRefDto } from './dto/update-source-ref.dto';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { UpdateContributorDto } from './dto/update-contributor.dto';
import { attachResolvedMedia, resolvedMediaUrl, type ResolvedMediaPayload } from './media.resolver';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

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

@Injectable()
export class EntitiesService {
  private readonly mediaPublicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  private readonly HOME_TYPES: EntityType[] = [
    'ARTWORK',
    'PERIOD',
    'MOVEMENT',
    'CONCEPT',
    'ARTIST',
  ];

  constructor(private prisma: PrismaService) { }

  private withResolvedMedia<T extends { mediaLinks?: any[] | null }>(entity: T): T & { resolvedMedia: ResolvedMediaPayload } {
    return attachResolvedMedia(entity);
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

  private isDirectedRelation(type: string): boolean {
    return !['RELATED_TO', 'ASSOCIATED_WITH'].includes(type);
  }

  private buildPublicUploadUrl(storageKey: string): string {
    return `${this.mediaPublicBaseUrl}/uploads/${storageKey}`;
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

  async list(query: ListEntitiesQuery) {

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

    const where: any = {};
    const and: any[] = [];

    if (query.type) where.type = query.type;

    if (status && Object.values(EntityStatus).includes(status as EntityStatus)) {
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

    if (!useRelevance) {

      const items = await this.prisma.entity.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy,
        include: {
          mediaLinks: {
            include: { media: true },
            orderBy: [
              { sortOrder: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      return {
        items: items.map((item) => this.withResolvedMedia(item)),
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
      .map((item) => this.withResolvedMedia(item));

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

  async home() {

    const results = await Promise.all(
      this.HOME_TYPES.map((type) =>
        this.prisma.entity.findFirst({
          where: { type },
          orderBy: { createdAt: 'desc' },
          include: {
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

    return results.filter(Boolean).map((entity) => this.withResolvedMedia(entity!));
  }

  async getBySlug(slug: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { slug },
      include: {
        artwork: true,
        artist: true,
        concept: true,
        period: true,
        mediaLinks: {
          include: { media: true },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        },
        contributors: true,
        sourceRefs: { include: { source: true } },
        outgoing: {
          include: {
            to: {
              include: {
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
          include: {
            from: {
              include: {
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
      ...this.withResolvedMedia(entity),
      outgoing: (entity.outgoing ?? []).map((relation: any) => ({
        ...relation,
        to: relation.to ? this.withResolvedMedia(relation.to) : relation.to,
      })),
      incoming: (entity.incoming ?? []).map((relation: any) => ({
        ...relation,
        from: relation.from ? this.withResolvedMedia(relation.from) : relation.from,
      })),
    };
  }

  async graphBySlug(slug: string) {

    const center = await this.prisma.entity.findUnique({
      where: { slug },
      include: {
        mediaLinks: {
          include: { media: true },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });

    if (!center) throw new NotFoundException('Entity not found');

    const relations = await this.prisma.relation.findMany({
      where: {
        OR: [
          { fromId: center.id },
          { toId: center.id },
        ],
      },
      include: {
        from: {
          include: {
            mediaLinks: {
              include: { media: true },
              orderBy: [
                { sortOrder: 'asc' },
                { id: 'asc' },
              ],
            },
          },
        },
        to: {
          include: {
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
    });

    const nodesMap = new Map<string, GraphNodePayload>();

    const toNodePayload = (node: any): GraphNodePayload => {
      const resolvedNode = this.withResolvedMedia(node);
      const image =
        resolvedMediaUrl(resolvedNode.resolvedMedia.thumbnail)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.card)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.detail)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.hero)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.explorer3d)
        ?? resolvedMediaUrl(resolvedNode.resolvedMedia.primary);

      return {
        id: node.id,
        label: node.title,
        type: node.type,
        slug: node.slug,
        image: image ?? null,
        resolvedMedia: resolvedNode.resolvedMedia,
        metadata: {
          summary: node.summary ?? null,
          startYear: node.startYear ?? null,
          endYear: node.endYear ?? null,
        },
      };
    };

    nodesMap.set(center.id, toNodePayload(center));

    for (const r of relations) {

      nodesMap.set(r.from.id, toNodePayload(r.from));
      nodesMap.set(r.to.id, toNodePayload(r.to));
    }

    const nodes = Array.from(nodesMap.values()).sort((a, b) => {
      if (a.id === center.id) return -1;
      if (b.id === center.id) return 1;
      return a.label.localeCompare(b.label, 'es');
    });

    const edges: GraphEdgePayload[] = relations.map((r) => ({
      id: r.id,
      source: r.fromId,
      target: r.toId,
      relationType: r.type,
      label: this.relationLabel(r.type),
      directed: this.isDirectedRelation(r.type),
      weight: r.weight ?? 1,
      justification: r.justification ?? null,
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

  async previewBySlug(slug: string) {

    const e = await this.prisma.entity.findUnique({
      where: { slug },
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
        mediaLinks: {
          take: 1,
          where: { role: 'PRIMARY_LEGACY' as any },
          select: {
            media: {
              select: {
                url: true,
                alt: true,
              },
            },
          },
        },
      },
    });

    if (!e) throw new NotFoundException('Entity not found');

    return e;
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
      },
    });

    await this.syncContentRelations(entity.id, entity.content);

    return entity;
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

    await this.syncContentRelations(entity.id, entity.content);

    return entity;
  }

  async adminDelete(id: string) {

    const existing = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Entity not found');
    }

    await this.prisma.entity.delete({
      where: { id },
    });

    return { ok: true };
  }

  async adminGetById(id: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        artwork: true,
        artist: true,
        concept: true,
        period: true,
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
          include: { source: true },
          orderBy: [
            { id: 'asc' },
          ],
        },
        outgoing: {
          include: {
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
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return entity;
  }

  async adminUpdateDetails(id: string, dto: UpdateEntityDetailsDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    switch (entity.type) {
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
        break;
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
        break;
      case 'CONCEPT':
        await this.prisma.conceptDetails.upsert({
          where: { entityId: id },
          update: {
            definition: dto.definition?.trim() || null,
          },
          create: {
            entityId: id,
            definition: dto.definition?.trim() || null,
          },
        });
        break;
      case 'PERIOD':
        await this.prisma.periodDetails.upsert({
          where: { entityId: id },
          update: {
            definition: dto.definition?.trim() || null,
          },
          create: {
            entityId: id,
            definition: dto.definition?.trim() || null,
          },
        });
        break;
      default:
        return this.adminGetById(id);
    }

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

    const media = await this.prisma.media.create({
      data: {
        url: dto.url.trim(),
        originType: MediaOriginType.EXTERNAL_URL,
        displayUrl: dto.displayUrl?.trim() || undefined,
        sourcePageUrl: dto.sourcePageUrl?.trim() || undefined,
        alt: dto.alt?.trim() || undefined,
        source: dto.source?.trim() || undefined,
        photoBy: dto.photoBy?.trim() || undefined,
        license: dto.license?.trim() || undefined,
      },
    });

    return this.prisma.entityMedia.create({
      data: {
        entityId,
        mediaId: media.id,
        role: dto.role ?? MediaRole.CARD,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
        displayMode: dto.displayMode ?? null,
        focalX: dto.focalX ?? null,
        focalY: dto.focalY ?? null,
      },
      include: {
        media: true,
      },
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

    const storageKey = `media/${file.filename}`;
    const publicUrl = this.buildPublicUploadUrl(storageKey);

    const media = await this.prisma.media.create({
      data: {
        url: publicUrl,
        canonicalUrl: publicUrl,
        displayUrl: publicUrl,
        originType: MediaOriginType.UPLOAD,
        storageKey,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        width: dto.width ?? undefined,
        height: dto.height ?? undefined,
        alt: dto.alt?.trim() || undefined,
        source: dto.source?.trim() || 'Uploaded via admin',
        photoBy: dto.photoBy?.trim() || undefined,
        license: dto.license?.trim() || undefined,
      },
    });

    return this.prisma.entityMedia.create({
      data: {
        entityId,
        mediaId: media.id,
        role: dto.role ?? MediaRole.CARD,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
        displayMode: dto.displayMode ?? null,
        focalX: dto.focalX ?? null,
        focalY: dto.focalY ?? null,
      },
      include: {
        media: true,
      },
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
            width: link.media.width ?? undefined,
            height: link.media.height ?? undefined,
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

    const mediaData = {
      url: dto.url?.trim(),
      displayUrl: dto.displayUrl !== undefined ? (dto.displayUrl?.trim() || null) : undefined,
      sourcePageUrl: dto.sourcePageUrl !== undefined ? (dto.sourcePageUrl?.trim() || null) : undefined,
      alt: dto.alt !== undefined ? (dto.alt?.trim() || null) : undefined,
      source: dto.source !== undefined ? (dto.source?.trim() || null) : undefined,
      photoBy: dto.photoBy !== undefined ? (dto.photoBy?.trim() || null) : undefined,
      license: dto.license !== undefined ? (dto.license?.trim() || null) : undefined,
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
          data: linkData,
        });
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

    return this.prisma.relation.findMany({
      where: { fromId: entityId },
      orderBy: { type: 'asc' },
      include: {
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

    return this.prisma.relation.create({
      data: {
        fromId: entityId,
        toId: dto.toId,
        type: dto.type.trim(),
        justification: dto.justification?.trim() || undefined,
        weight: dto.weight,
      },
      include: {
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

    return this.prisma.relation.findMany({
      where: { toId: entityId },
      orderBy: { type: 'asc' },
      include: {
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
        title: dto.sourceTitle.trim(),
        author: dto.sourceAuthor?.trim() || null,
        publisher: dto.sourcePublisher?.trim() || null,
        year: dto.sourceYear ?? null,
        url: dto.sourceUrl?.trim() || null,
      },
    });

    return this.prisma.sourceRef.create({
      data: {
        entityId,
        sourceId: source.id,
        page: dto.page?.trim() || null,
        quote: dto.quote?.trim() || null,
        note: dto.note?.trim() || null,
      },
      include: {
        source: true,
      },
    });
  }

  async adminUpdateSourceRef(entityId: string, refId: string, dto: UpdateSourceRefDto) {
    const existing = await this.prisma.sourceRef.findFirst({
      where: {
        id: refId,
        entityId,
      },
      include: {
        source: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Source reference not found');
    }

    await this.prisma.source.update({
      where: { id: existing.sourceId },
      data: {
        type: dto.sourceType ?? undefined,
        title: dto.sourceTitle !== undefined ? (dto.sourceTitle?.trim() || existing.source.title) : undefined,
        author: dto.sourceAuthor !== undefined ? (dto.sourceAuthor?.trim() || null) : undefined,
        publisher: dto.sourcePublisher !== undefined ? (dto.sourcePublisher?.trim() || null) : undefined,
        year: dto.sourceYear !== undefined ? (dto.sourceYear ?? null) : undefined,
        url: dto.sourceUrl !== undefined ? (dto.sourceUrl?.trim() || null) : undefined,
      },
    });

    return this.prisma.sourceRef.update({
      where: { id: refId },
      data: {
        page: dto.page !== undefined ? (dto.page?.trim() || null) : undefined,
        quote: dto.quote !== undefined ? (dto.quote?.trim() || null) : undefined,
        note: dto.note !== undefined ? (dto.note?.trim() || null) : undefined,
      },
      include: {
        source: true,
      },
    });
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

    // Crear nuevas relaciones que no existían
    for (const target of targets) {
      if (!existingTargetIds.has(target.id)) {
        await this.prisma.relation.create({
          data: {
            fromId: entityId,
            toId: target.id,
            type: 'MENTIONS',
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
