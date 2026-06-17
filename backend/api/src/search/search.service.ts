import { Injectable } from '@nestjs/common';
import { HomeDeckSurface, Prisma } from '@prisma/client';
import { attachResolvedMedia } from '../entities/media.resolver';
import { normalizeLocale, resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQuery } from './dto/search.query';

type RawSearchRow = {
  id: string;
  score: number | string;
  matched_title: boolean;
  matched_summary: boolean;
  matched_content: boolean;
  matched_slug: boolean;
};

type SearchItem = { id: string; slug: string; type: string; title: string; summary: string | null; [key: string]: any };

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
  constructor(private prisma: PrismaService) {}

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

    let rows = await this.searchRows(q, {
      limit,
      types,
      tag,
      locale,
      includeDrafts: options.includeDrafts,
    });

    // ponytail: term fallback, replace with proper query-intent parsing if this grows.
    if (!rows.length && q) {
      const fallbackQuery = this.significantTerms(q).join(' ');
      if (fallbackQuery && fallbackQuery !== q) {
        rows = await this.searchRows(fallbackQuery, {
          limit,
          types,
          tag,
          locale,
          includeDrafts: options.includeDrafts,
        });
      }
    }

    if (!rows.length) {
      return {
        query: q,
        total: 0,
        items: [],
        groups: {},
        sections: [],
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
      .map((entity) => this.serializeSearchEntity(
        entity,
        locale,
        scoreById.get(entity.id) ?? 0,
        matchedFieldsById.get(entity.id) ?? [],
      ));

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
    };
  }

  private entityInclude(locale: string) {
    return {
      tags: {
        include: { tag: true },
        orderBy: [{ tag: { label: 'asc' as const } }],
      },
      mediaLinks: {
        include: { media: true },
        orderBy: [
          { sortOrder: 'asc' as const },
          { id: 'asc' as const },
        ],
      },
      translations: {
        where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
      },
    };
  }

  private serializeSearchEntity(entity: any, locale: string, score = 0, matchedFields: string[] = []) {
    const resolvedEntity = attachResolvedMedia(resolveEntityTranslation(entity, locale));

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
      score,
      matchedFields,
    };
  }

  private async buildSections(query: string, directItems: SearchItem[], locale: string, includeDrafts: boolean) {
    const seedIds = directItems.slice(0, 12).map((item) => item.id);
    const entityById = new Map<string, SearchItem>(directItems.map((item) => [item.id, item]));

    if (seedIds.length) {
      const relations = await this.prisma.relation.findMany({
        where: {
          type: { in: DISCOVERY_RELATION_TYPES },
          OR: [
            { fromId: { in: seedIds }, to: includeDrafts ? undefined : { status: 'PUBLISHED' } },
            { toId: { in: seedIds }, from: includeDrafts ? undefined : { status: 'PUBLISHED' } },
          ],
        },
        include: {
          from: { include: this.entityInclude(locale) },
          to: { include: this.entityInclude(locale) },
          relationType: {
            include: {
              translations: { where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } } },
            },
          },
          translations: { where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } } },
        },
        orderBy: [{ weight: 'desc' }, { id: 'asc' }],
        take: 90,
      });

      for (const relation of relations) {
        for (const entity of [relation.from, relation.to]) {
          if (entity && !entityById.has(entity.id)) {
            entityById.set(entity.id, this.serializeSearchEntity(entity, locale, relation.weight ?? 0, ['relation']));
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
        : this.byType([...directItems, ...relatedOnly], ['ARTWORK'], 12);
      const relatedWorks = authoredWorks.length
        ? this.relatedArtworks(relations, new Set(keyWorks.map((item) => item.id)), locale)
        : [];
      const routes = this.buildRoutes(relations, locale).slice(0, 6);
      const decks = await this.findSuggestedDecks(query, allItems, locale);

      return [
        this.itemSection('main', 'Resultados principales', directItems.slice(0, 12)),
        this.itemSection('keyWorks', 'Obras clave', keyWorks),
        this.itemSection('relatedWorks', 'Obras relacionadas', relatedWorks),
        this.itemSection('concepts', 'Conceptos relacionados', this.byType([...directItems, ...relatedOnly], ['CONCEPT'], 12)),
        this.itemSection('context', 'Artistas y movimientos', this.byType([...directItems, ...relatedOnly], ['ARTIST', 'MOVEMENT', 'PERIOD'], 12)),
        this.itemSection('articles', 'Artículos', this.byType([...directItems, ...relatedOnly], ['ARTICLE', 'TEXT'], 8)),
        { key: 'routes', title: 'Relaciones para explorar', routes },
        { key: 'decks', title: 'Colecciones sugeridas', decks },
      ].filter((section: any) => section.items?.length || section.routes?.length || section.decks?.length);
    }

    return [this.itemSection('main', 'Resultados principales', directItems.slice(0, 12))];
  }

  private itemSection(key: string, title: string, items: SearchItem[]) {
    return { key, title, items: this.dedupeItems(items) };
  }

  private byType(items: SearchItem[], types: string[], limit: number) {
    return this.dedupeItems(items.filter((item) => types.includes(item.type))).slice(0, limit);
  }

  private artworksCreatedBy(
    relations: Array<{ type: string; weight: number | null; from: any; to: any }>,
    artistIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(relations
      .filter((relation) => relation.type === 'CREATED_BY')
      .map((relation) => {
        if (artistIds.has(relation.to?.id) && relation.from?.type === 'ARTWORK') return relation.from;
        if (artistIds.has(relation.from?.id) && relation.to?.type === 'ARTWORK') return relation.to;
        return null;
      })
      .filter((entity): entity is NonNullable<typeof entity> => !!entity)
      .map((entity) => this.serializeSearchEntity(entity, locale, 1, ['relation'])))
      .slice(0, 12);
  }

  private relatedArtworks(
    relations: Array<{ type: string; weight: number | null; from: any; to: any; justification?: string | null; translations?: any[] | null; relationType?: any }>,
    excludedIds: Set<string>,
    locale: string,
  ) {
    return this.dedupeItems(relations
      .filter((relation) => relation.type === 'RELATED_TO')
      .flatMap((relation) => [
        relation.from?.type === 'ARTWORK' ? { entity: relation.from, relation } : null,
        relation.to?.type === 'ARTWORK' ? { entity: relation.to, relation } : null,
      ])
      .filter((entry): entry is { entity: any; relation: any } => !!entry && !excludedIds.has(entry.entity.id))
      .map(({ entity, relation }) => {
        const counterpart = relation.from?.id === entity.id ? relation.to : relation.from;
        return {
          ...this.serializeSearchEntity(entity, locale, 0.5, ['relation']),
          relationType: this.relationDisplayLabel(relation, locale),
          relationReason: this.relationJustification(relation, locale),
          relationWithTitle: counterpart ? this.serializeSearchEntity(counterpart, locale).title : null,
        };
      }))
      .slice(0, 12);
  }

  private dedupeItems(items: SearchItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private buildRoutes(relations: Array<{ type: string; weight: number | null; from: any; to: any; relationType?: any }>, locale: string) {
    const seen = new Set<string>();
    return relations
      .map((relation) => {
        const from = this.serializeSearchEntity(relation.from, locale, relation.weight ?? 0, ['route']);
        const to = this.serializeSearchEntity(relation.to, locale, relation.weight ?? 0, ['route']);
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
      .filter(Boolean);
  }

  private relationDisplayLabel(relation: { type: string; relationType?: any }, locale: string) {
    const translation = relation.relationType?.translations?.find((item: any) => item.locale === locale)
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'es')
      ?? relation.relationType?.translations?.find((item: any) => item.locale === 'en')
      ?? null;
    return translation?.label?.trim()
      ?? relation.relationType?.label?.trim()
      ?? relation.type.toLowerCase().replaceAll('_', ' ');
  }

  private relationJustification(relation: { justification?: string | null; translations?: any[] | null }, locale: string) {
    const translation = relation.translations?.find((item: any) => item.locale === locale)
      ?? relation.translations?.find((item: any) => item.locale === 'es')
      ?? relation.translations?.find((item: any) => item.locale === 'en')
      ?? null;
    return translation?.justification?.trim() || relation.justification?.trim() || null;
  }

  private async findSuggestedDecks(query: string, items: SearchItem[], locale: string) {
    const terms = this.significantTerms(query);
    const itemIds = new Set(items.map((item) => item.id));
    const decks = await this.prisma.homeDeck.findMany({
      where: { isActive: true, surface: HomeDeckSurface.RECOMMENDED },
      include: {
        translations: { where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } } },
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
        const translation = deck.translations.find((item: any) => item.locale === locale)
          ?? deck.translations.find((item: any) => item.locale === 'es')
          ?? deck.translations.find((item: any) => item.locale === 'en')
          ?? null;
        const title = translation?.title ?? deck.title;
        const description = translation?.description ?? deck.description;
        const haystack = `${title} ${description ?? ''} ${deck.items.map((item: any) => item.entity?.title ?? '').join(' ')}`.toLowerCase();
        const textScore = terms.filter((term) => haystack.includes(term)).length;
        const graphScore = deck.items.filter((item: any) => itemIds.has(item.entityId)).length;
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
            entity: item.entity ? this.serializeSearchEntity(item.entity, locale) : null,
          })),
        };
      })
      .filter((deck) => deck.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  private significantTerms(query: string) {
    const stopwords = new Set(['a', 'al', 'and', 'arte', 'art', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'of', 'para', 'por', 'sobre', 'the', 'un', 'una', 'y']);
    return query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !stopwords.has(term));
  }

  private searchRows(
    q: string,
    options: { limit: number; types: string[]; tag?: string; locale: string; includeDrafts: boolean },
  ) {
    const normalized = q.toLowerCase();
    const like = `%${q}%`;
    const startsWith = `${q}%`;
    const useFullText = q.length >= 3;
    const translationLocales = Array.from(new Set([options.locale, 'es', 'en']));

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
          + CASE WHEN e."summary" ILIKE ${like} THEN 8 ELSE 0 END
          + CASE WHEN coalesce(translated.summary_text, '') ILIKE ${like} THEN 8 ELSE 0 END
          + CASE WHEN e."content" ILIKE ${like} THEN 2 ELSE 0 END
          + CASE WHEN coalesce(translated.content_text, '') ILIKE ${like} THEN 2 ELSE 0 END
          + CASE WHEN e."slug" ILIKE ${startsWith} THEN 12 ELSE 0 END
        )::double precision AS "score",
        (e."title" ILIKE ${like} OR coalesce(translated.title_text, '') ILIKE ${like}) AS "matched_title",
        (e."summary" ILIKE ${like} OR coalesce(translated.summary_text, '') ILIKE ${like}) AS "matched_summary",
        (e."content" ILIKE ${like} OR coalesce(translated.content_text, '') ILIKE ${like}) AS "matched_content",
        (e."slug" ILIKE ${like}) AS "matched_slug"
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
          setweight(to_tsvector('simple', concat_ws(' ', coalesce(e."title", ''), translated.title_text)), 'A') ||
          setweight(to_tsvector('simple', concat_ws(' ', coalesce(e."summary", ''), translated.summary_text)), 'B') ||
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
          OR e."summary" ILIKE ${like}
          OR coalesce(translated.summary_text, '') ILIKE ${like}
          OR e."content" ILIKE ${like}
          OR coalesce(translated.content_text, '') ILIKE ${like}
          OR e."slug" ILIKE ${like}
        )
      ORDER BY
        CASE WHEN lower(e."title") = ${normalized} THEN 1 ELSE 0 END DESC,
        CASE WHEN e."title" ILIKE ${startsWith} THEN 1 ELSE 0 END DESC,
        "score" DESC,
        e."updatedAt" DESC
      LIMIT ${options.limit};
    `;
  }
}
