import { Injectable } from '@nestjs/common';
import { HomeDeckSurface, Prisma } from '@prisma/client';
import { attachResolvedMedia } from '../entities/media.resolver';
import {
  normalizeLocale,
  resolveEntityTranslation,
} from '../entities/entity-translation.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQuery } from './dto/search.query';
import {
  SearchIntentService,
  type SearchQueryVariant,
} from './search-intent.service';

type RawSearchRow = {
  id: string;
  score: number | string;
  matched_title: boolean;
  matched_summary: boolean;
  matched_content: boolean;
  matched_slug: boolean;
  matched_alias: boolean;
  matched_tag: boolean;
  matched_detail: boolean;
  matched_relation: boolean;
  trigram_score: number | string;
};

type SearchItem = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  [key: string]: any;
};
type SearchSectionPayload = {
  key: string;
  title: string;
  total: number;
  items?: SearchItem[];
  routes?: Array<{
    id: string;
    label: string;
    relationType: string;
    items: SearchItem[];
  }>;
  decks?: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    entities: Array<{
      id: string;
      sortOrder: number;
      entity: SearchItem | null;
    }>;
  }>;
};

const DISCOVERY_RELATION_TYPES = [
  'ABOUT_CONCEPT',
  'CREATED_BY',
  'BELONGS_TO_MOVEMENT',
  'BELONGS_TO_PERIOD',
  'RELATED_TO',
  'ASSOCIATED_WITH',
  'MENTIONS',
];

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private searchIntent: SearchIntentService,
  ) {}

  async search(query: SearchQuery, options: { includeDrafts: boolean }) {
    const q = (query.q ?? '').trim();
    const tag = (query.tag ?? '').trim();
    const locale = normalizeLocale(query.locale);
    const limit = Math.min(60, Math.max(1, Number(query.limit ?? 20)));
    const types = Array.isArray(query.type) ? query.type.filter(Boolean) : [];

    if (!q && !tag) {
      return {
        query: q,
        total: 0,
        items: [],
        groups: {},
        sections: [],
      };
    }

    const intent = this.searchIntent.interpret(q, locale);
    const variants = intent.variants.length
      ? intent.variants
      : [{ query: q, reason: 'raw query', weight: 1 }];
    const rows = await this.searchVariantRows(variants, {
      limit,
      types,
      tag,
      locale,
      includeDrafts: options.includeDrafts,
    });

    if (!rows.length) {
      return {
        query: q,
        total: 0,
        items: [],
        groups: {},
        sections: [],
        interpretation: {
          normalizedQuery: intent.normalizedQuery,
          significantTerms: intent.significantTerms,
          signals: intent.signals,
          variantsTried: variants.map((variant) => ({
            query: variant.query,
            reason: variant.reason,
          })),
        },
      };
    }

    const scoreById = new Map(
      rows.map((row) => [row.id, Number(row.score ?? 0)]),
    );
    const matchedFieldsById = new Map(
      rows.map((row) => [
        row.id,
        [
          row.matched_title ? 'title' : null,
          row.matched_summary ? 'summary' : null,
          row.matched_content ? 'content' : null,
          row.matched_slug ? 'slug' : null,
          row.matched_alias ? 'alias' : null,
          row.matched_tag ? 'tag' : null,
          row.matched_detail ? 'detail' : null,
          row.matched_relation ? 'relation_text' : null,
        ].filter((field): field is string => !!field),
      ]),
    );

    const entities = await this.prisma.entity.findMany({
      where: {
        id: {
          in: rows.map((row) => row.id),
        },
      },
      include: this.entityInclude(locale),
    });

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const items = rows
      .map((row) => entityById.get(row.id))
      .filter((entity): entity is NonNullable<typeof entity> => !!entity)
      .map((entity) =>
        this.serializeSearchEntity(
          entity,
          locale,
          scoreById.get(entity.id) ?? 0,
          matchedFieldsById.get(entity.id) ?? [],
        ),
      );

    const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
      acc[item.type] ??= [];
      acc[item.type].push(item);
      return acc;
    }, {});

    const sections = await this.buildSections(
      q,
      items,
      locale,
      options.includeDrafts,
    );

    return {
      query: q,
      total: items.length,
      items,
      groups,
      sections,
      interpretation: {
        normalizedQuery: intent.normalizedQuery,
        significantTerms: intent.significantTerms,
        signals: intent.signals,
        variantsTried: variants.map((variant) => ({
          query: variant.query,
          reason: variant.reason,
        })),
      },
    };
  }

  private entityInclude(locale: string) {
    return {
      tags: {
        include: { tag: { include: { translations: true } } },
        orderBy: [{ tag: { label: 'asc' as const } }],
      },
      aliases: {
        orderBy: [
          { locale: 'asc' as const },
          { kind: 'asc' as const },
          { value: 'asc' as const },
        ],
      },
      mediaLinks: {
        include: { media: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
      translations: {
        where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
      },
    };
  }

  private serializeSearchEntity(
    entity: any,
    locale: string,
    score = 0,
    matchedFields: string[] = [],
  ) {
    const resolvedEntity = attachResolvedMedia(
      resolveEntityTranslation(entity, locale),
    );
    const matchReasons = matchedFields.map((field) => {
      switch (field) {
        case 'alias':
          return 'Matched via alternate name';
        case 'tag':
          return 'Matched via taxonomy';
        case 'title':
          return 'Matched via title';
        case 'summary':
          return 'Matched via summary';
        case 'content':
          return 'Matched via content';
        case 'slug':
          return 'Matched via slug';
        case 'detail':
          return 'Matched via structured detail';
        case 'relation_text':
          return 'Matched via graph context';
        case 'relation':
          return 'Matched via relation';
        case 'route':
          return 'Matched via discovery route';
        default:
          return 'Matched via search';
      }
    });

    return {
      id: entity.id,
      slug: entity.slug,
      type: resolvedEntity.type,
      title: resolvedEntity.title,
      summary: resolvedEntity.summary,
      status: resolvedEntity.status,
      contentLevel: resolvedEntity.contentLevel,
      startYear: resolvedEntity.startYear,
      endYear: resolvedEntity.endYear,
      resolvedMedia: {
        thumbnail: resolvedEntity.resolvedMedia.thumbnail,
        card: resolvedEntity.resolvedMedia.card,
      },
      tags: (entity.tags ?? []).map((entityTag: any) => entityTag.tag),
      aliases: (entity.aliases ?? []).map((alias: any) => ({
        id: alias.id,
        locale: alias.locale,
        value: alias.value,
        kind: alias.kind,
        weight: alias.weight,
      })),
      score,
      matchedFields,
      matchReasons,
    };
  }

  private async buildSections(
    query: string,
    directItems: SearchItem[],
    locale: string,
    includeDrafts: boolean,
  ) {
    const seedIds = directItems.slice(0, 12).map((item) => item.id);
    const entityById = new Map<string, SearchItem>(
      directItems.map((item) => [item.id, item]),
    );

    if (seedIds.length) {
      const relations = await this.prisma.relation.findMany({
        where: {
          type: { in: DISCOVERY_RELATION_TYPES },
          OR: [
            {
              fromId: { in: seedIds },
              to: includeDrafts ? undefined : { status: 'PUBLISHED' },
            },
            {
              toId: { in: seedIds },
              from: includeDrafts ? undefined : { status: 'PUBLISHED' },
            },
          ],
        },
        include: {
          from: { include: this.entityInclude(locale) },
          to: { include: this.entityInclude(locale) },
          relationType: {
            include: {
              translations: {
                where: {
                  locale: { in: Array.from(new Set([locale, 'es', 'en'])) },
                },
              },
            },
          },
          translations: {
            where: {
              locale: { in: Array.from(new Set([locale, 'es', 'en'])) },
            },
          },
        },
        orderBy: [{ weight: 'desc' }, { id: 'asc' }],
        take: 90,
      });

      for (const relation of relations) {
        for (const entity of [relation.from, relation.to]) {
          if (entity && !entityById.has(entity.id)) {
            entityById.set(
              entity.id,
              this.serializeSearchEntity(entity, locale, relation.weight ?? 0, [
                'relation',
              ]),
            );
          }
        }
      }

      const allItems = Array.from(entityById.values());
      const relatedOnly = allItems.filter((item) => !seedIds.includes(item.id));
      const primaryArtists = directItems
        .filter((item) => item.type === 'ARTIST')
        .slice(0, 3);
      const authoredWorks = primaryArtists.length
        ? this.artworksCreatedBy(
            relations,
            new Set(primaryArtists.map((item) => item.id)),
            locale,
          )
        : [];
      const keyWorks = authoredWorks.length
        ? authoredWorks
        : this.byType([...directItems, ...relatedOnly], ['ARTWORK']);
      const relatedWorks = authoredWorks.length
        ? this.relatedArtworks(
            relations,
            new Set(keyWorks.map((item) => item.id)),
            locale,
          )
        : [];
      const conceptItems = this.byType(
        [...directItems, ...relatedOnly],
        ['CONCEPT'],
      );
      const contextItems = this.byType(
        [...directItems, ...relatedOnly],
        ['ARTIST', 'MOVEMENT', 'PERIOD'],
      );
      const articleItems = this.byType(
        [...directItems, ...relatedOnly],
        ['ARTICLE', 'TEXT'],
      );
      const routes = this.buildRoutes(relations, locale);
      const decks = await this.findSuggestedDecks(query, allItems, locale);

      return [
        this.itemSection('main', 'Resultados principales', directItems, 12),
        this.itemSection('keyWorks', 'Obras clave', keyWorks, 12),
        this.itemSection(
          'relatedWorks',
          'Obras relacionadas',
          relatedWorks,
          12,
        ),
        this.itemSection(
          'concepts',
          'Conceptos relacionados',
          conceptItems,
          12,
        ),
        this.itemSection('context', 'Artistas y movimientos', contextItems, 12),
        this.itemSection('articles', 'Artículos', articleItems, 8),
        this.routeSection('routes', 'Relaciones para explorar', routes, 6),
        this.deckSection('decks', 'Colecciones sugeridas', decks, 4),
      ].filter(
        (section: any) =>
          section.items?.length ||
          section.routes?.length ||
          section.decks?.length,
      );
    }

    return [
      this.itemSection('main', 'Resultados principales', directItems, 12),
    ];
  }

  private itemSection(
    key: string,
    title: string,
    items: SearchItem[],
    visibleLimit = items.length,
  ): SearchSectionPayload {
    const deduped = this.dedupeItems(items);
    return {
      key,
      title,
      total: deduped.length,
      items: deduped.slice(0, visibleLimit),
    };
  }

  private routeSection(
    key: string,
    title: string,
    routes: Array<{
      id: string;
      label: string;
      relationType: string;
      items: SearchItem[];
    }>,
    visibleLimit = routes.length,
  ): SearchSectionPayload {
    return {
      key,
      title,
      total: routes.length,
      routes: routes.slice(0, visibleLimit),
    };
  }

  private deckSection(
    key: string,
    title: string,
    decks: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      entities: Array<{
        id: string;
        sortOrder: number;
        entity: SearchItem | null;
      }>;
    }>,
    visibleLimit = decks.length,
  ): SearchSectionPayload {
    return {
      key,
      title,
      total: decks.length,
      decks: decks.slice(0, visibleLimit),
    };
  }

  private byType(items: SearchItem[], types: string[]) {
    return this.dedupeItems(items.filter((item) => types.includes(item.type)));
  }

  private artworksCreatedBy(
    relations: Array<{
      type: string;
      weight: number | null;
      from: any;
      to: any;
    }>,
    artistIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(
      relations
        .filter((relation) => relation.type === 'CREATED_BY')
        .map((relation) => {
          if (
            artistIds.has(relation.to?.id) &&
            relation.from?.type === 'ARTWORK'
          )
            return relation.from;
          if (
            artistIds.has(relation.from?.id) &&
            relation.to?.type === 'ARTWORK'
          )
            return relation.to;
          return null;
        })
        .filter((entity): entity is NonNullable<typeof entity> => !!entity)
        .map((entity) =>
          this.serializeSearchEntity(entity, locale, 1, ['relation']),
        ),
    );
  }

  private relatedArtworks(
    relations: Array<{
      type: string;
      weight: number | null;
      from: any;
      to: any;
      justification?: string | null;
      translations?: any[] | null;
      relationType?: any;
    }>,
    excludedIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(
      relations
        .filter((relation) => relation.type === 'RELATED_TO')
        .flatMap((relation) => [
          relation.from?.type === 'ARTWORK'
            ? { entity: relation.from, relation }
            : null,
          relation.to?.type === 'ARTWORK'
            ? { entity: relation.to, relation }
            : null,
        ])
        .filter(
          (entry): entry is { entity: any; relation: any } =>
            !!entry && !excludedIds.has(entry.entity.id),
        )
        .map(({ entity, relation }) => {
          const counterpart =
            relation.from?.id === entity.id ? relation.to : relation.from;
          return {
            ...this.serializeSearchEntity(entity, locale, 0.5, ['relation']),
            relationType: this.relationDisplayLabel(relation, locale),
            relationReason: this.relationJustification(relation, locale),
            relationWithTitle: counterpart
              ? this.serializeSearchEntity(counterpart, locale).title
              : null,
          };
        }),
    );
  }

  private dedupeItems(items: SearchItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private buildRoutes(
    relations: Array<{
      type: string;
      weight: number | null;
      from: any;
      to: any;
      relationType?: any;
    }>,
    locale: string,
  ) {
    const seen = new Set<string>();
    return relations
      .map((relation) => {
        const from = this.serializeSearchEntity(
          relation.from,
          locale,
          relation.weight ?? 0,
          ['route'],
        );
        const to = this.serializeSearchEntity(
          relation.to,
          locale,
          relation.weight ?? 0,
          ['route'],
        );
        const key = `${from.id}:${to.id}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          id: key,
          label: `${from.title} → ${to.title}`,
          relationType: this.relationDisplayLabel(relation, locale),
          items: [from, to],
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: string;
          label: string;
          relationType: string;
          items: SearchItem[];
        } => !!entry,
      );
  }

  private relationDisplayLabel(
    relation: { type: string; relationType?: any },
    locale: string,
  ) {
    const translation =
      relation.relationType?.translations?.find(
        (item: any) => item.locale === locale,
      ) ??
      relation.relationType?.translations?.find(
        (item: any) => item.locale === 'es',
      ) ??
      relation.relationType?.translations?.find(
        (item: any) => item.locale === 'en',
      ) ??
      null;
    return (
      translation?.label?.trim() ??
      relation.relationType?.label?.trim() ??
      relation.type.toLowerCase().replaceAll('_', ' ')
    );
  }

  private relationJustification(
    relation: { justification?: string | null; translations?: any[] | null },
    locale: string,
  ) {
    const translation =
      relation.translations?.find((item: any) => item.locale === locale) ??
      relation.translations?.find((item: any) => item.locale === 'es') ??
      relation.translations?.find((item: any) => item.locale === 'en') ??
      null;
    return (
      translation?.justification?.trim() ||
      relation.justification?.trim() ||
      null
    );
  }

  private async findSuggestedDecks(
    query: string,
    items: SearchItem[],
    locale: string,
  ) {
    const terms = this.searchIntent.interpret(query, locale).significantTerms;
    const itemIds = new Set(items.map((item) => item.id));
    const decks = await this.prisma.homeDeck.findMany({
      where: { isActive: true, surface: HomeDeckSurface.RECOMMENDED },
      include: {
        translations: {
          where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
        },
        items: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { entity: { include: this.entityInclude(locale) } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    });

    return decks
      .map((deck: any) => {
        const translation =
          deck.translations.find((item: any) => item.locale === locale) ??
          deck.translations.find((item: any) => item.locale === 'es') ??
          deck.translations.find((item: any) => item.locale === 'en') ??
          null;
        const title = translation?.title ?? deck.title;
        const description = translation?.description ?? deck.description;
        const haystack =
          `${title} ${description ?? ''} ${deck.items.map((item: any) => item.entity?.title ?? '').join(' ')}`.toLowerCase();
        const textScore = terms.filter((term) =>
          haystack.includes(term),
        ).length;
        const graphScore = deck.items.filter((item: any) =>
          itemIds.has(item.entityId),
        ).length;
        return {
          id: deck.id,
          slug: deck.slug,
          title,
          subtitle: translation?.subtitle ?? deck.subtitle,
          description,
          score: textScore + graphScore,
          entities: deck.items.slice(0, 6).map((item: any) => ({
            id: item.id,
            sortOrder: item.sortOrder,
            entity: item.entity
              ? this.serializeSearchEntity(item.entity, locale)
              : null,
          })),
        };
      })
      .filter((deck) => deck.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private async searchVariantRows(
    variants: SearchQueryVariant[],
    options: {
      limit: number;
      types: string[];
      tag?: string;
      locale: string;
      includeDrafts: boolean;
    },
  ) {
    const merged = new Map<string, RawSearchRow>();

    for (const variant of variants) {
      const rows = await this.searchRows(variant.query, options);
      for (const row of rows) {
        const weightedScore = Number(row.score ?? 0) * variant.weight;
        const previous = merged.get(row.id);

        if (!previous) {
          merged.set(row.id, {
            ...row,
            score: weightedScore,
          });
          continue;
        }

        merged.set(row.id, {
          ...previous,
          score: Math.max(Number(previous.score ?? 0), weightedScore),
          matched_title: previous.matched_title || row.matched_title,
          matched_summary: previous.matched_summary || row.matched_summary,
          matched_content: previous.matched_content || row.matched_content,
          matched_slug: previous.matched_slug || row.matched_slug,
          matched_alias: previous.matched_alias || row.matched_alias,
          matched_tag: previous.matched_tag || row.matched_tag,
          matched_detail: previous.matched_detail || row.matched_detail,
          matched_relation: previous.matched_relation || row.matched_relation,
          trigram_score: Math.max(
            Number(previous.trigram_score ?? 0),
            Number(row.trigram_score ?? 0),
          ),
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => {
        const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return Number(b.trigram_score ?? 0) - Number(a.trigram_score ?? 0);
      })
      .slice(0, options.limit);
  }

  private searchRows(
    q: string,
    options: {
      limit: number;
      types: string[];
      tag?: string;
      locale: string;
      includeDrafts: boolean;
    },
  ) {
    const normalized = q.toLowerCase();
    const like = `%${q}%`;
    const startsWith = `${q}%`;
    const useFullText = q.length >= 3;
    const trigramThreshold = q.length >= 4 ? 0.24 : 0.36;
    const translationLocales = Array.from(
      new Set([options.locale, 'es', 'en', 'und']),
    );

    const typeFilter = options.types.length
      ? Prisma.sql`AND e."type"::text IN (${Prisma.join(options.types)})`
      : Prisma.empty;
    const visibilityFilter = options.includeDrafts
      ? Prisma.empty
      : Prisma.sql`AND e."status" = 'PUBLISHED'::"EntityStatus"`;
    const tagFilter = options.tag
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM "EntityTag" et
          JOIN "Tag" t ON t."id" = et."tagId"
          WHERE et."entityId" = e."id"
            AND t."slug" = ${options.tag}
            AND t."isActive" = true
        )
      `
      : Prisma.empty;

    const fullTextPredicate = useFullText
      ? Prisma.sql`weighted.document @@ websearch_to_tsquery('simple', ${q}) OR`
      : Prisma.empty;

    const fullTextRank = useFullText
      ? Prisma.sql`ts_rank_cd(weighted.document, websearch_to_tsquery('simple', ${q}))`
      : Prisma.sql`0`;

    return this.prisma.$queryRaw<RawSearchRow[]>`
      SELECT
        e."id",
        (
          ${fullTextRank} * 100
          + CASE WHEN lower(e."title") = ${normalized} THEN 100 ELSE 0 END
          + CASE WHEN lower(coalesce(translated.title_text, '')) = ${normalized} THEN 100 ELSE 0 END
          + CASE WHEN e."title" ILIKE ${startsWith} THEN 50 ELSE 0 END
          + CASE WHEN coalesce(translated.title_text, '') ILIKE ${startsWith} THEN 50 ELSE 0 END
          + CASE WHEN e."title" ILIKE ${like} THEN 25 ELSE 0 END
          + CASE WHEN coalesce(translated.title_text, '') ILIKE ${like} THEN 25 ELSE 0 END
          + CASE WHEN coalesce(alias_data.alias_text, '') ILIKE ${startsWith} THEN 45 ELSE 0 END
          + CASE WHEN coalesce(alias_data.alias_text, '') ILIKE ${like} THEN 22 ELSE 0 END
          + CASE WHEN coalesce(tag_data.tag_text, '') ILIKE ${startsWith} THEN 20 ELSE 0 END
          + CASE WHEN coalesce(tag_data.tag_text, '') ILIKE ${like} THEN 10 ELSE 0 END
          + CASE WHEN coalesce(detail_data.detail_text, '') ILIKE ${startsWith} THEN 18 ELSE 0 END
          + CASE WHEN coalesce(detail_data.detail_text, '') ILIKE ${like} THEN 9 ELSE 0 END
          + CASE WHEN e."summary" ILIKE ${like} THEN 8 ELSE 0 END
          + CASE WHEN coalesce(translated.summary_text, '') ILIKE ${like} THEN 8 ELSE 0 END
          + CASE WHEN e."content" ILIKE ${like} THEN 2 ELSE 0 END
          + CASE WHEN coalesce(translated.content_text, '') ILIKE ${like} THEN 2 ELSE 0 END
          + CASE WHEN coalesce(relation_data.relation_text, '') ILIKE ${like} THEN 6 ELSE 0 END
          + CASE WHEN e."slug" ILIKE ${startsWith} THEN 12 ELSE 0 END
          + GREATEST(
              similarity(lower(e."title"), ${normalized}),
              similarity(lower(coalesce(translated.title_text, '')), ${normalized}),
              similarity(lower(coalesce(alias_data.alias_text, '')), ${normalized}),
              similarity(lower(coalesce(tag_data.tag_text, '')), ${normalized}),
              similarity(lower(coalesce(detail_data.detail_text, '')), ${normalized})
            ) * 18
        )::double precision AS "score",
        (e."title" ILIKE ${like} OR coalesce(translated.title_text, '') ILIKE ${like}) AS "matched_title",
        (e."summary" ILIKE ${like} OR coalesce(translated.summary_text, '') ILIKE ${like}) AS "matched_summary",
        (e."content" ILIKE ${like} OR coalesce(translated.content_text, '') ILIKE ${like}) AS "matched_content",
        (e."slug" ILIKE ${like}) AS "matched_slug",
        (coalesce(alias_data.alias_text, '') ILIKE ${like}) AS "matched_alias",
        (coalesce(tag_data.tag_text, '') ILIKE ${like}) AS "matched_tag",
        (coalesce(detail_data.detail_text, '') ILIKE ${like}) AS "matched_detail",
        (coalesce(relation_data.relation_text, '') ILIKE ${like}) AS "matched_relation",
        GREATEST(
          similarity(lower(e."title"), ${normalized}),
          similarity(lower(coalesce(translated.title_text, '')), ${normalized}),
          similarity(lower(coalesce(alias_data.alias_text, '')), ${normalized}),
          similarity(lower(coalesce(tag_data.tag_text, '')), ${normalized}),
          similarity(lower(coalesce(detail_data.detail_text, '')), ${normalized})
        )::double precision AS "trigram_score"
      FROM "Entity" e
      CROSS JOIN LATERAL (
        SELECT
          coalesce(string_agg(t."title", ' '), '') AS title_text,
          coalesce(
            string_agg(
              concat_ws(' ', nullif(t."shortDescription", ''), nullif(t."excerpt", '')),
              ' '
            ),
            ''
          ) AS summary_text,
          coalesce(string_agg(t."essay", ' '), '') AS content_text
        FROM "EntityTranslation" t
        WHERE t."entityId" = e."id"
          AND t."locale" IN (${Prisma.join(translationLocales)})
      ) translated
      CROSS JOIN LATERAL (
        SELECT
          coalesce(string_agg(a."value", ' '), '') AS alias_text
        FROM "EntityAlias" a
        WHERE a."entityId" = e."id"
          AND a."locale" IN (${Prisma.join(translationLocales)})
      ) alias_data
      CROSS JOIN LATERAL (
        SELECT
          coalesce(
            string_agg(
              DISTINCT trim(concat_ws(' ', tg."label", tt."label")),
              ' '
            ),
            ''
          ) AS tag_text
        FROM "EntityTag" et
        JOIN "Tag" tg ON tg."id" = et."tagId"
        LEFT JOIN "TagTranslation" tt ON tt."tagId" = tg."id"
          AND tt."locale" IN (${Prisma.join(translationLocales)})
        WHERE et."entityId" = e."id"
          AND tg."isActive" = true
      ) tag_data
      CROSS JOIN LATERAL (
        SELECT concat_ws(
          ' ',
          coalesce(artwork_data.detail_text, ''),
          coalesce(artist_data.detail_text, ''),
          coalesce(concept_data.detail_text, ''),
          coalesce(period_data.detail_text, '')
        ) AS detail_text
        FROM (
          SELECT coalesce(string_agg(value_text, ' '), '') AS detail_text
          FROM (
            SELECT concat_ws(' ', ad."authorNation", ad."technique", ad."materials", ad."dimensions", ad."location", ad."collection", ad."state") AS value_text
            FROM "ArtworkDetails" ad
            WHERE ad."entityId" = e."id"
            UNION ALL
            SELECT concat_ws(' ', adt."authorNation", adt."technique", adt."materials", adt."dimensions", adt."location", adt."collection", adt."state") AS value_text
            FROM "ArtworkDetailsTranslation" adt
            WHERE adt."entityId" = e."id"
              AND adt."locale" IN (${Prisma.join(translationLocales)})
          ) artwork_values
        ) artwork_data,
        (
          SELECT coalesce(string_agg(value_text, ' '), '') AS detail_text
          FROM (
            SELECT concat_ws(' ', ard."country", ard."city", ard."disciplines", ard."bioShort", ard."links") AS value_text
            FROM "ArtistDetails" ard
            WHERE ard."entityId" = e."id"
            UNION ALL
            SELECT concat_ws(' ', ardt."country", ardt."city", ardt."disciplines", ardt."bioShort", ardt."links") AS value_text
            FROM "ArtistDetailsTranslation" ardt
            WHERE ardt."entityId" = e."id"
              AND ardt."locale" IN (${Prisma.join(translationLocales)})
          ) artist_values
        ) artist_data,
        (
          SELECT coalesce(string_agg(value_text, ' '), '') AS detail_text
          FROM (
            SELECT cd."definition" AS value_text
            FROM "ConceptDetails" cd
            WHERE cd."entityId" = e."id"
            UNION ALL
            SELECT cdt."definition" AS value_text
            FROM "ConceptDetailsTranslation" cdt
            WHERE cdt."entityId" = e."id"
              AND cdt."locale" IN (${Prisma.join(translationLocales)})
          ) concept_values
        ) concept_data,
        (
          SELECT coalesce(string_agg(value_text, ' '), '') AS detail_text
          FROM (
            SELECT pd."definition" AS value_text
            FROM "PeriodDetails" pd
            WHERE pd."entityId" = e."id"
            UNION ALL
            SELECT pdt."definition" AS value_text
            FROM "PeriodDetailsTranslation" pdt
            WHERE pdt."entityId" = e."id"
              AND pdt."locale" IN (${Prisma.join(translationLocales)})
          ) period_values
        ) period_data
      ) detail_data
      CROSS JOIN LATERAL (
        SELECT coalesce(string_agg(rel_text, ' '), '') AS relation_text
        FROM (
          SELECT r."justification" AS rel_text
          FROM "Relation" r
          WHERE (r."fromId" = e."id" OR r."toId" = e."id")
            AND r."justification" IS NOT NULL
          UNION ALL
          SELECT rt."justification" AS rel_text
          FROM "Relation" r
          JOIN "RelationTranslation" rt ON rt."relationId" = r."id"
          WHERE (r."fromId" = e."id" OR r."toId" = e."id")
            AND rt."locale" IN (${Prisma.join(translationLocales)})
            AND rt."justification" IS NOT NULL
        ) relation_values
      ) relation_data
      CROSS JOIN LATERAL (
        SELECT
          setweight(to_tsvector('simple', concat_ws(' ', coalesce(e."title", ''), translated.title_text)), 'A') ||
          setweight(to_tsvector('simple', alias_data.alias_text), 'A') ||
          setweight(to_tsvector('simple', tag_data.tag_text), 'B') ||
          setweight(to_tsvector('simple', detail_data.detail_text), 'B') ||
          setweight(to_tsvector('simple', concat_ws(' ', coalesce(e."summary", ''), translated.summary_text)), 'B') ||
          setweight(to_tsvector('simple', relation_data.relation_text), 'C') ||
          setweight(to_tsvector('simple', concat_ws(' ', coalesce(e."content", ''), translated.content_text)), 'C') AS document
      ) weighted
      WHERE 1 = 1
        ${visibilityFilter}
        ${typeFilter}
        ${tagFilter}
        AND (
          ${fullTextPredicate}
          e."title" ILIKE ${like}
          OR coalesce(translated.title_text, '') ILIKE ${like}
          OR coalesce(alias_data.alias_text, '') ILIKE ${like}
          OR coalesce(tag_data.tag_text, '') ILIKE ${like}
          OR coalesce(detail_data.detail_text, '') ILIKE ${like}
          OR e."summary" ILIKE ${like}
          OR coalesce(translated.summary_text, '') ILIKE ${like}
          OR e."content" ILIKE ${like}
          OR coalesce(translated.content_text, '') ILIKE ${like}
          OR coalesce(relation_data.relation_text, '') ILIKE ${like}
          OR e."slug" ILIKE ${like}
          OR GREATEST(
            similarity(lower(e."title"), ${normalized}),
            similarity(lower(coalesce(translated.title_text, '')), ${normalized}),
            similarity(lower(coalesce(alias_data.alias_text, '')), ${normalized}),
            similarity(lower(coalesce(tag_data.tag_text, '')), ${normalized}),
            similarity(lower(coalesce(detail_data.detail_text, '')), ${normalized})
          ) >= ${trigramThreshold}
        )
      ORDER BY
        CASE WHEN lower(e."title") = ${normalized} THEN 1 ELSE 0 END DESC,
        CASE WHEN coalesce(alias_data.alias_text, '') ILIKE ${startsWith} THEN 1 ELSE 0 END DESC,
        CASE WHEN e."title" ILIKE ${startsWith} THEN 1 ELSE 0 END DESC,
        "score" DESC,
        "trigram_score" DESC,
        e."updatedAt" DESC
      LIMIT ${options.limit};
    `;
  }
}
