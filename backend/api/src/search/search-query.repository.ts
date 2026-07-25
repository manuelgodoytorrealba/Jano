import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SearchRow = {
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

@Injectable()
export class SearchQueryRepository {
  constructor(private prisma: PrismaService) {}

  search(
    q: string,
    options: {
      limit: number;
      types: string[];
      tag?: string;
      kinds: string[];
      locale: string;
      includeDrafts: boolean;
    },
  ) {
    const normalized = q.toLowerCase();
    const like = `%${q}%`;
    const startsWith = `${q}%`;
    const useFullText = q.length >= 3;
    const trigramThreshold = q.length >= 4 ? 0.24 : 0.36;
    const translationLocales = Array.from(new Set([options.locale, 'es', 'en', 'und']));

    const typeFilter = options.types.length
      ? Prisma.sql`AND e."type"::text IN (${Prisma.join(options.types)})`
      : Prisma.empty;
    const kindFilter = options.kinds.length
      ? Prisma.sql`AND e."kind"::text IN (${Prisma.join(options.kinds)})`
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

    return this.prisma.$queryRaw<SearchRow[]>`
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
        ${kindFilter}
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
