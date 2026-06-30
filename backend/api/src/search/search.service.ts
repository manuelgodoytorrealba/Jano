import { Injectable } from '@nestjs/common';
import { HomeDeckSurface } from '@prisma/client';
import { attachResolvedMedia } from '../media/media.resolver';
import { normalizeLocale, resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { PrismaService } from '../prisma/prisma.service';
import {
  canonicalRelationKey,
  canonicalRelationTypeFilter,
} from '../relation-types/relation-type.utils';
import { SearchQuery } from './dto/search.query';
import { SearchIntentService, type SearchQueryVariant } from './search-intent.service';
import { SearchQueryRepository, type SearchRow } from './search-query.repository';

type SearchItem = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  [key: string]: unknown;
};

type SearchEntityRecord = Parameters<typeof resolveEntityTranslation>[0] & {
  id: string;
  slug: string;
  title: string;
  type: string;
  status?: string | null;
  contentLevel?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  tags?: Array<{ tag: Record<string, unknown> }> | null;
  aliases?: Array<{
    id: string;
    locale: string | null;
    value: string;
    kind: string | null;
    weight: number | null;
  }> | null;
};

type SearchSection = SearchSectionPayload;

type RelationTypeTranslationRecord = {
  locale: string;
  label?: string | null;
};

type RelationTextTranslationRecord = {
  locale: string;
  justification?: string | null;
};

type SearchRelationTypeRecord = {
  key: string;
  label?: string | null;
  translations?: RelationTypeTranslationRecord[] | null;
};

type SearchRelationRecord = {
  weight: number | null;
  from: SearchEntityRecord | null;
  to: SearchEntityRecord | null;
  justification?: string | null;
  translations?: RelationTextTranslationRecord[] | null;
  relationType: SearchRelationTypeRecord;
};

type SuggestedDeckTranslationRecord = {
  locale: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
};

type SuggestedDeckItemRecord = {
  id: string;
  sortOrder: number;
  entityId: string;
  entity: SearchEntityRecord | null;
};

type SuggestedDeckRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  translations: SuggestedDeckTranslationRecord[];
  items: SuggestedDeckItemRecord[];
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
    private searchQuery: SearchQueryRepository,
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

    const scoreById = new Map(rows.map((row) => [row.id, Number(row.score ?? 0)]));
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

    const sections = await this.buildSections(q, items, locale, options.includeDrafts);

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
        orderBy: [{ locale: 'asc' as const }, { kind: 'asc' as const }, { value: 'asc' as const }],
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
    entity: SearchEntityRecord,
    locale: string,
    score = 0,
    matchedFields: string[] = [],
  ) {
    const resolvedEntity = attachResolvedMedia(resolveEntityTranslation(entity, locale));
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
      tags: (entity.tags ?? []).map((entityTag) => entityTag.tag),
      aliases: (entity.aliases ?? []).map((alias) => ({
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
    const entityById = new Map<string, SearchItem>(directItems.map((item) => [item.id, item]));

    if (seedIds.length) {
      const relations = await this.prisma.relation.findMany({
        where: {
          AND: [
            canonicalRelationTypeFilter(DISCOVERY_RELATION_TYPES),
            {
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
              this.serializeSearchEntity(entity, locale, relation.weight ?? 0, ['relation']),
            );
          }
        }
      }

      const allItems = Array.from(entityById.values());
      const relatedOnly = allItems.filter((item) => !seedIds.includes(item.id));
      const primaryArtists = directItems.filter((item) => item.type === 'ARTIST').slice(0, 3);
      const authoredWorks = primaryArtists.length
        ? this.artworksCreatedBy(relations, new Set(primaryArtists.map((item) => item.id)), locale)
        : [];
      const keyWorks = authoredWorks.length
        ? authoredWorks
        : this.byType([...directItems, ...relatedOnly], ['ARTWORK']);
      const relatedWorks = authoredWorks.length
        ? this.relatedArtworks(relations, new Set(keyWorks.map((item) => item.id)), locale)
        : [];
      const conceptItems = this.byType([...directItems, ...relatedOnly], ['CONCEPT']);
      const contextItems = this.byType(
        [...directItems, ...relatedOnly],
        ['ARTIST', 'MOVEMENT', 'PERIOD'],
      );
      const articleItems = this.byType([...directItems, ...relatedOnly], ['ARTICLE', 'TEXT']);
      const routes = this.buildRoutes(relations, locale);
      const decks = await this.findSuggestedDecks(query, allItems, locale);

      return [
        this.itemSection('main', 'Resultados principales', directItems, 12),
        this.itemSection('keyWorks', 'Obras clave', keyWorks, 12),
        this.itemSection('relatedWorks', 'Obras relacionadas', relatedWorks, 12),
        this.itemSection('concepts', 'Conceptos relacionados', conceptItems, 12),
        this.itemSection('context', 'Artistas y movimientos', contextItems, 12),
        this.itemSection('articles', 'Artículos', articleItems, 8),
        this.routeSection('routes', 'Relaciones para explorar', routes, 6),
        this.deckSection('decks', 'Colecciones sugeridas', decks, 4),
      ].filter(
        (section: SearchSection) =>
          section.items?.length || section.routes?.length || section.decks?.length,
      );
    }

    return [this.itemSection('main', 'Resultados principales', directItems, 12)];
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
    relations: SearchRelationRecord[],
    artistIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(
      relations
        .filter((relation) => canonicalRelationKey(relation) === 'CREATED_BY')
        .map((relation) => {
          if (relation.to?.id && artistIds.has(relation.to.id) && relation.from?.type === 'ARTWORK')
            return relation.from;
          if (
            relation.from?.id &&
            artistIds.has(relation.from.id) &&
            relation.to?.type === 'ARTWORK'
          )
            return relation.to;
          return null;
        })
        .filter((entity): entity is NonNullable<typeof entity> => !!entity)
        .map((entity) => this.serializeSearchEntity(entity, locale, 1, ['relation'])),
    );
  }

  private relatedArtworks(
    relations: SearchRelationRecord[],
    excludedIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(
      relations
        .filter((relation) => canonicalRelationKey(relation) === 'RELATED_TO')
        .flatMap((relation) => [
          relation.from?.type === 'ARTWORK' ? { entity: relation.from, relation } : null,
          relation.to?.type === 'ARTWORK' ? { entity: relation.to, relation } : null,
        ])
        .filter(
          (entry): entry is { entity: SearchEntityRecord; relation: SearchRelationRecord } =>
            !!entry && !excludedIds.has(entry.entity.id),
        )
        .map(({ entity, relation }) => {
          const counterpart = relation.from?.id === entity.id ? relation.to : relation.from;
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
    relations: SearchRelationRecord[],
    locale: string,
  ): Array<{
    id: string;
    label: string;
    relationType: string;
    items: SearchItem[];
  }> {
    const seen = new Set<string>();
    return relations.flatMap((relation) => {
      if (!relation.from || !relation.to) {
        return [];
      }

      const from = this.serializeSearchEntity(relation.from, locale, relation.weight ?? 0, [
        'route',
      ]);
      const to = this.serializeSearchEntity(relation.to, locale, relation.weight ?? 0, ['route']);
      const key = `${from.id}:${to.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          id: key,
          label: `${from.title} → ${to.title}`,
          relationType: this.relationDisplayLabel(relation, locale),
          items: [from, to],
        },
      ];
    });
  }

  private relationDisplayLabel(
    relation: { relationType: SearchRelationTypeRecord },
    locale: string,
  ) {
    const translation =
      relation.relationType?.translations?.find((item) => item.locale === locale) ??
      relation.relationType?.translations?.find((item) => item.locale === 'es') ??
      relation.relationType?.translations?.find((item) => item.locale === 'en') ??
      null;
    return (
      translation?.label?.trim() ??
      relation.relationType?.label?.trim() ??
      canonicalRelationKey(relation).toLowerCase().replaceAll('_', ' ')
    );
  }

  private relationJustification(
    relation: {
      justification?: string | null;
      translations?: RelationTextTranslationRecord[] | null;
    },
    locale: string,
  ) {
    const translation =
      relation.translations?.find((item) => item.locale === locale) ??
      relation.translations?.find((item) => item.locale === 'es') ??
      relation.translations?.find((item) => item.locale === 'en') ??
      null;
    return translation?.justification?.trim() || relation.justification?.trim() || null;
  }

  private async findSuggestedDecks(query: string, items: SearchItem[], locale: string) {
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
      .map((deck: SuggestedDeckRecord) => {
        const translation =
          deck.translations.find((item) => item.locale === locale) ??
          deck.translations.find((item) => item.locale === 'es') ??
          deck.translations.find((item) => item.locale === 'en') ??
          null;
        const title = translation?.title ?? deck.title;
        const description = translation?.description ?? deck.description;
        const haystack =
          `${title} ${description ?? ''} ${deck.items.map((item) => item.entity?.title ?? '').join(' ')}`.toLowerCase();
        const textScore = terms.filter((term) => haystack.includes(term)).length;
        const graphScore = deck.items.filter((item) => itemIds.has(item.entityId)).length;
        return {
          id: deck.id,
          slug: deck.slug,
          title,
          subtitle: translation?.subtitle ?? deck.subtitle,
          description,
          score: textScore + graphScore,
          entities: deck.items.slice(0, 6).map((item) => ({
            id: item.id,
            sortOrder: item.sortOrder,
            entity: item.entity ? this.serializeSearchEntity(item.entity, locale) : null,
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
    const merged = new Map<string, SearchRow>();

    for (const variant of variants) {
      const rows = await this.searchQuery.search(variant.query, options);
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
}
