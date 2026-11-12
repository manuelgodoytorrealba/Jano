import { SearchQueryRepository } from '../search/search-query.repository';
import { SearchIntentService } from '../search/search-intent.service';
import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalRelationKey } from '../relation-types/relation-type.utils';
import { normalizeLocale, resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { facetCounts, matchesLayers, parseLayers, type Layers, type LayerKey } from './layers';
import { DiscoveryQuery } from './discovery.query';
import { paletteFamilies, readPalette, VISUAL_VERSION } from './image-features';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchQueryRepository,
    private readonly intent: SearchIntentService,
  ) {}

  async context(query: DiscoveryQuery, candidateIds?: string[]) {
    const layers = parseLayers(query.layers);
    const locale = normalizeLocale(query.locale);
    if (query.surface === 'search' && query.q?.trim() && !candidateIds) {
      const intent = this.intent.interpret(query.q.trim(), locale);
      const variants = intent.variants.length
        ? intent.variants
        : [{ query: query.q.trim(), reason: 'raw query', weight: 1 }];
      const rows = await Promise.all(
        variants.map((variant) =>
          this.search.search(variant.query, {
            limit: 10000,
            types: [],
            kinds: [],
            locale,
            includeDrafts: false,
          }),
        ),
      );
      candidateIds = [...new Set(rows.flatMap((rows) => rows.map((row) => row.id)))];
    }
    const entities = await this.prisma.entity.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query.type ? { type: query.type } : {}),
        ...(candidateIds ? { id: { in: candidateIds } } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.deck
          ? {
              homeDeckItems: {
                some: { deck: { isActive: true, OR: [{ id: query.deck }, { slug: query.deck }] } },
              },
            }
          : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        slug: true,
        summary: true,
        content: !!query.q,
        contentLevel: true,
        translations: {
          where: { locale: { in: [locale, 'es', 'en'] } },
          select: { locale: true, title: true, shortDescription: true },
        },
        artwork: { select: { technique: true, materials: true, location: true } },
        artist: { select: { country: true } },
        tags: {
          where: { tag: { isActive: true } },
          select: { tag: { select: { slug: true, label: true } } },
        },
        outgoing: {
          where: { status: 'PUBLISHED', to: { status: 'PUBLISHED' } },
          select: {
            relationType: { select: { key: true } },
            to: { select: { slug: true, title: true, type: true } },
          },
        },
      },
    });
    const palettes = await this.prisma.$queryRaw<
      { entityId: string; palette: unknown }[]
    >(Prisma.sql`
      SELECT em."entityId", m."visualIndex"->'palette' AS palette
      FROM "EntityMedia" em JOIN "Media" m ON m.id=em."mediaId"
      JOIN "Entity" e ON e.id=em."entityId"
      WHERE e.status='PUBLISHED' AND m."visualIndex"->>'version'=${VISUAL_VERSION}
    `);
    const colors = new Map<string, Set<string>>();
    for (const item of palettes) {
      const set = colors.get(item.entityId) ?? new Set<string>();
      paletteFamilies(readPalette(item.palette)).forEach((color) => set.add(color));
      colors.set(item.entityId, set);
    }
    const labels = new Map<string, string>();
    const q = (query.q ?? '').trim().toLocaleLowerCase(locale);
    const items = entities.flatMap((entity) => {
      const localized = resolveEntityTranslation(entity, locale);
      if (
        q &&
        !candidateIds &&
        ![localized.title, localized.summary, localized.content, entity.slug].some((v) =>
          v?.toLocaleLowerCase(locale).includes(q),
        )
      )
        return [];
      const values: Layers = {
        type: [entity.type],
        contentLevel: entity.contentLevel ? [entity.contentLevel] : [],
      };
      const add = (key: LayerKey, value?: string | null, label = value) => {
        if (!value) return;
        (values[key] ??= []).push(value);
        if (label) labels.set(key + ':' + value, label);
      };
      add('technique', entity.artwork?.technique);
      add('material', entity.artwork?.materials);
      add('institution', entity.artwork?.location);
      add('nationality', entity.artist?.country);
      entity.tags.forEach(({ tag }) => add('tag', tag.slug, tag.label));
      for (const relation of entity.outgoing) {
        const key = canonicalRelationKey(relation);
        if (key === 'CREATED_BY') add('author', relation.to.slug, relation.to.title);
        if (key === 'USES_TECHNIQUE') add('technique', relation.to.slug, relation.to.title);
        if (key === 'USES_MATERIAL') add('material', relation.to.slug, relation.to.title);
        if (key === 'LOCATED_IN') add('institution', relation.to.slug, relation.to.title);
        if (key === 'BELONGS_TO_PERIOD') add('period', relation.to.slug, relation.to.title);
        if (
          relation.to.type === 'MOVEMENT' &&
          ['BELONGS_TO_MOVEMENT', 'ASSOCIATED_WITH'].includes(key)
        )
          add('movement', relation.to.slug, relation.to.title);
      }
      colors.get(entity.id)?.forEach((color) => add('color', color));
      return [{ id: entity.id, values }];
    });
    const facets = facetCounts(items, layers).map((facet) => ({
      ...facet,
      options: facet.options.map((option) => ({
        ...option,
        label: labels.get(facet.key + ':' + option.value) ?? option.label,
      })),
    }));
    const ids = items.filter((item) => matchesLayers(item, layers)).map((item) => item.id);
    return { ids, total: ids.length, facets };
  }
}
