import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      };
    }

    const rows = await this.searchRows(q, {
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
      include: {
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
        translations: {
          where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
        },
      },
    });

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const items = rows
      .map((row) => entityById.get(row.id))
      .filter((entity): entity is NonNullable<typeof entity> => !!entity)
      .map((entity) => {
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
          tags: (entity.tags ?? []).map((entityTag) => entityTag.tag),
          score: scoreById.get(entity.id) ?? 0,
          matchedFields: matchedFieldsById.get(entity.id) ?? [],
        };
      });

    const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
      acc[item.type] ??= [];
      acc[item.type].push(item);
      return acc;
    }, {});

    return {
      query: q,
      total: items.length,
      items,
      groups,
    };
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
