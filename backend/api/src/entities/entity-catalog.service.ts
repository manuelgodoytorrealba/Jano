import { Injectable } from '@nestjs/common';
import { ContentLevel, EntityStatus, Prisma } from '@prisma/client';
import { resolveEntityMediaSlot } from '../media/media.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalRelationTypeFilter } from '../relation-types/relation-type.utils';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';
import { localizedInclude, resolveLocalizedEntity } from './entity.presenter';
import { normalizeLocale, translationStatusSummary } from './entity-translation.resolver';

@Injectable()
export class EntityCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly HOME_TYPES: EntityType[] = [
    'ARTWORK',
    'ARTICLE',
    'PERIOD',
    'MOVEMENT',
    'CONCEPT',
    'ARTIST',
  ];

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

    const where: Prisma.EntityWhereInput = {};
    const and: Prisma.EntityWhereInput[] = [];

    let deckEntityOrder: string[] = [];

    if (deck && deck !== 'undefined' && deck !== 'null') {
      const homeDeck = await this.prisma.homeDeck.findFirst({
        where: {
          OR: [{ id: deck }, { slug: deck }],
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
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
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
            ...canonicalRelationTypeFilter(['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH']),
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
            ...canonicalRelationTypeFilter(['BELONGS_TO_PERIOD']),
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
        : sort === 'updated' && !options.publicOnly
          ? { updatedAt: 'desc' as const }
          : { createdAt: 'desc' as const };

    const useCuratedOrder = deckEntityOrder.length > 0 && sort !== 'title' && !useRelevance;

    if (!useRelevance) {
      const items = await this.prisma.entity.findMany({
        where,
        skip: useCuratedOrder ? undefined : skip,
        take: useCuratedOrder ? undefined : safeLimit,
        orderBy: useCuratedOrder ? undefined : orderBy,
        include: {
          translations: localizedInclude(locale),
          tags: {
            include: { tag: true },
            orderBy: [{ tag: { label: 'asc' } }],
          },
          mediaLinks: {
            include: { media: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
          ...(options.publicOnly
            ? {}
            : {
                _count: {
                  select: {
                    outgoing: true,
                    incoming: true,
                    sourceRefs: true,
                  },
                },
              }),
        },
      });

      const orderedItems = useCuratedOrder
        ? items
            .sort((a, b) => deckEntityOrder.indexOf(a.id) - deckEntityOrder.indexOf(b.id))
            .slice(skip, skip + safeLimit)
        : items;

      return {
        items: orderedItems.map((item) =>
          this.serializeCatalogItem(item, locale, options.publicOnly),
        ),
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
        translations: localizedInclude(locale),
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          include: { media: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        ...(options.publicOnly
          ? {}
          : {
              _count: {
                select: {
                  outgoing: true,
                  incoming: true,
                  sourceRefs: true,
                },
              },
            }),
      },
    });

    const needle = q.toLowerCase();

    const score = (e: {
      title?: string | null;
      summary?: string | null;
      content?: string | null;
    }) => {
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

        return new Date(b.e.createdAt).getTime() - new Date(a.e.createdAt).getTime();
      })
      .map((x) => x.e);

    const items = ranked
      .slice(skip, skip + safeLimit)
      .map((item) => this.serializeCatalogItem(item, locale, options.publicOnly));

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
  }

  private serializeCatalogItem<T extends Parameters<typeof resolveLocalizedEntity>[0]>(
    item: T,
    locale: string,
    publicOnly: boolean,
  ) {
    const localized = resolveLocalizedEntity(item, locale);
    if (publicOnly) {
      return localized;
    }

    const counted = localized as typeof localized & {
      _count?: {
        outgoing: number;
        incoming: number;
        sourceRefs: number;
      };
    };
    const { _count, ...entity } = counted;
    const visual = resolveEntityMediaSlot(item, 'thumbnail');

    return {
      ...entity,
      editorialSummary: {
        visualSource: visual.source,
        relationsCount: (_count?.outgoing ?? 0) + (_count?.incoming ?? 0),
        sourcesCount: _count?.sourceRefs ?? 0,
        translationStatus: translationStatusSummary(item.translations),
      },
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
      new Set(rows.map((row) => row.location?.trim()).filter((value): value is string => !!value)),
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
      new Set(rows.map((row) => row.country?.trim()).filter((value): value is string => !!value)),
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
            translations: localizedInclude(locale),
            tags: {
              include: { tag: true },
              orderBy: [{ tag: { label: 'asc' } }],
            },
            mediaLinks: {
              include: { media: true },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        }),
      ),
    );

    return results.flatMap((entity) => (entity ? [resolveLocalizedEntity(entity, locale)] : []));
  }
}
