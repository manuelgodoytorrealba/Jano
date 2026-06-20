import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface } from '@prisma/client';
import { attachResolvedMedia } from '../entities/media.resolver';
import { normalizeLocale, resolveEntityTranslation } from '../entities/entity-translation.resolver';
import { PrismaService } from '../prisma/prisma.service';

type CuratedEntity = {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary: string | null;
  content: string | null;
  startYear: number | null;
  endYear: number | null;
  resolvedMedia: Record<string, any>;
  artwork?: any;
  artist?: any;
  concept?: any;
  period?: any;
};

type CuratedDeck = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: {
    url: string;
    alt: string | null;
  } | null;
  entityCount: number;
  createdAt?: Date;
};

type CuratedMapEntity = CuratedEntity & {
  connectionIds: string[];
  curationCount: number;
  relatedCount: number;
};

type CandidateScore = {
  entity: any;
  score: number;
};

const DISCOVERY_TYPES = ['CONCEPT', 'MOVEMENT', 'PERIOD', 'ARTIST', 'ARTWORK'] as const;
const CONCEPTUAL_TYPES = new Set(['CONCEPT', 'MOVEMENT', 'PERIOD']);
const KEY_RELATION_TYPES = new Set([
  'ABOUT_CONCEPT',
  'ASSOCIATED_WITH',
  'BELONGS_TO_MOVEMENT',
  'BELONGS_TO_PERIOD',
  'CREATED_BY',
  'RELATED_TO',
  'MENTIONS',
]);
const DISCOVERY_RELATION_TYPES = Array.from(KEY_RELATION_TYPES);

@Injectable()
export class CuratedService {
  constructor(private readonly prisma: PrismaService) {}

  async page(selectedSlug?: string, locale?: string) {
    const safeLocale = normalizeLocale(locale);
    const recommendedDecks = await this.prisma.homeDeck.findMany({
      where: {
        isActive: true,
        surface: HomeDeckSurface.RECOMMENDED,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        imageMedia: true,
        translations: {
          where: { locale: { in: Array.from(new Set([safeLocale, 'es', 'en'])) } },
        },
        items: {
          where: {
            entity: {
              status: EntityStatus.PUBLISHED,
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            entity: {
              include: this.entityInclude(safeLocale),
            },
          },
        },
      },
    });

    const discoveryPool = this.buildDiscoveryPool(recommendedDecks, safeLocale);
    const initialEntity = discoveryPool[0];
    const resolvedSlug = selectedSlug?.trim() || initialEntity?.slug;

    if (!resolvedSlug) {
      throw new NotFoundException('No curated entities available');
    }

    const selectedEntityRecord = await this.prisma.entity.findFirst({
      where: {
        slug: resolvedSlug,
        status: EntityStatus.PUBLISHED,
      },
      include: this.entityInclude(safeLocale),
    });

    if (!selectedEntityRecord) {
      throw new NotFoundException('Curated entity not found');
    }

    const selectedEntity = this.serializeEntity(selectedEntityRecord, safeLocale);
    const selectedDecks = recommendedDecks
      .filter((deck) => deck.items.some((item: any) => item.entityId === selectedEntity.id))
      .map((deck) => this.serializeDeck(deck, safeLocale));

    const directRelations = await this.loadRelations([selectedEntity.id], safeLocale, 48);
    const directCandidates = this.collectCandidates(directRelations, new Set([selectedEntity.id]));
    const directNeighbors = this.rankCandidates(directCandidates);

    const bridgeSeedIds = directNeighbors.slice(0, 8).map((candidate) => candidate.entity.id);
    const bridgeRelations = bridgeSeedIds.length
      ? await this.loadRelations(bridgeSeedIds, safeLocale, 96)
      : [];
    const shelfCandidates = this.mergeCandidateMaps(
      directCandidates,
      this.collectCandidates(bridgeRelations, new Set([selectedEntity.id, ...bridgeSeedIds]), 0.62),
    );
    const rankedShelfCandidates = this.rankCandidates(shelfCandidates);

    const baseDiscovery = discoveryPool.slice(0, 20);
    const discoveryEntityMap = new Map(baseDiscovery.map((entity) => [entity.id, entity]));
    discoveryEntityMap.set(selectedEntity.id, selectedEntityRecord);

    const discoveryIds = Array.from(discoveryEntityMap.keys());
    const discoveryConnections = await this.prisma.relation.findMany({
      where: {
        type: { in: DISCOVERY_RELATION_TYPES },
        fromId: { in: discoveryIds },
        toId: { in: discoveryIds },
      },
      select: {
        id: true,
        fromId: true,
        toId: true,
        type: true,
        weight: true,
        relationType: {
          select: {
            directed: true,
            key: true,
          },
        },
      },
    });

    const adjacency = new Map<string, Set<string>>();
    for (const entityId of discoveryIds) {
      adjacency.set(entityId, new Set());
    }

    for (const relation of discoveryConnections) {
      adjacency.get(relation.fromId)?.add(relation.toId);
      adjacency.get(relation.toId)?.add(relation.fromId);
    }

    const deckCountByEntityId = new Map<string, number>();
    for (const deck of recommendedDecks) {
      for (const item of deck.items ?? []) {
        deckCountByEntityId.set(item.entityId, (deckCountByEntityId.get(item.entityId) ?? 0) + 1);
      }
    }

    const discoveryEntities = Array.from(discoveryEntityMap.values()).map((entity) => {
      const relatedCount = adjacency.get(entity.id)?.size ?? 0;
      return {
        ...this.serializeEntity(entity, safeLocale),
        connectionIds: Array.from(adjacency.get(entity.id) ?? []).sort(),
        curationCount: deckCountByEntityId.get(entity.id) ?? 0,
        relatedCount,
      };
    });

    const graphNodes = discoveryEntities
      .slice()
      .sort((a, b) => {
        if (a.id === selectedEntity.id) return -1;
        if (b.id === selectedEntity.id) return 1;
        return a.title.localeCompare(b.title);
      })
      .map((entity) => ({
        id: entity.id,
        label: entity.title,
        type: entity.type,
        slug: entity.slug,
        image:
          entity.resolvedMedia?.thumbnail?.url
          ?? entity.resolvedMedia?.card?.url
          ?? entity.resolvedMedia?.primary?.url
          ?? null,
        metadata: {
          summary: entity.summary ?? null,
          startYear: entity.startYear ?? null,
          endYear: entity.endYear ?? null,
        },
      }));
    const graphEdges = discoveryConnections.map((relation) => ({
      id: relation.id,
      source: relation.fromId,
      target: relation.toId,
      relationType: relation.relationType?.key ?? relation.type,
      directed: relation.relationType?.directed ?? false,
      weight: relation.weight ?? 1,
    }));
    const graph = {
      centerId: selectedEntity.id,
      nodes: graphNodes,
      edges: graphEdges,
      filters: {
        entityTypes: Array.from(new Set(graphNodes.map((node) => node.type))).sort(),
        relationTypes: Array.from(new Set(graphEdges.map((edge) => edge.relationType))).sort(),
      },
    };

    const staffPickIds = new Set(selectedDecks.slice(0, 3).map((deck) => deck.id));
    const recentlyAdded = recommendedDecks
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((deck) => !staffPickIds.has(deck.id))
      .slice(0, 6)
      .map((deck) => this.serializeDeck(deck, safeLocale));

    return {
      selectedEntity,
      discoveryEntities,
      graph,
      staffPicks: selectedDecks.slice(0, 3),
      tabGroups: {
        curations: selectedDecks,
        articles: this.pickByType(rankedShelfCandidates, ['ARTICLE', 'TEXT'], 8, safeLocale),
        artists: this.pickByType(rankedShelfCandidates, ['ARTIST'], 8, safeLocale),
        artworks: this.pickByType(rankedShelfCandidates, ['ARTWORK'], 8, safeLocale),
        concepts: this.pickByType(rankedShelfCandidates, Array.from(CONCEPTUAL_TYPES), 8, safeLocale),
      },
      keyEntities: this.pickDiverse(rankedShelfCandidates, 6, new Set(['ARTICLE', 'TEXT', 'PLACE']), safeLocale),
      relatedEntities: this.pickByType(
        directNeighbors,
        ['CONCEPT', 'MOVEMENT', 'PERIOD', 'ARTIST', 'ARTWORK', 'ARTICLE', 'PLACE'],
        8,
        safeLocale,
      ),
      recentlyAdded,
    };
  }

  private entityInclude(locale: string) {
    return {
      translations: {
        where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
      },
      mediaLinks: {
        include: { media: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
      artwork: {
        include: {
          translations: {
            where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
          },
        },
      },
      artist: {
        include: {
          translations: {
            where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
          },
        },
      },
      concept: {
        include: {
          translations: {
            where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
          },
        },
      },
      period: {
        include: {
          translations: {
            where: { locale: { in: Array.from(new Set([locale, 'es', 'en'])) } },
          },
        },
      },
    };
  }

  private localizeDetail<T extends Record<string, any> | null | undefined>(detail: T, locale: string, fields: string[]): T {
    if (!detail) {
      return detail;
    }

    const translations = Array.isArray((detail as any).translations) ? (detail as any).translations : [];
    const resolved = translations.find((item: any) => item?.locale === locale)
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

  private serializeEntity(entity: any, locale: string): CuratedEntity {
    const localized = attachResolvedMedia(resolveEntityTranslation(entity, locale));
    return {
      id: localized.id,
      slug: localized.slug,
      title: localized.title,
      type: localized.type,
      summary: localized.summary ?? null,
      content: localized.content ?? null,
      startYear: localized.startYear ?? null,
      endYear: localized.endYear ?? null,
      resolvedMedia: localized.resolvedMedia ?? {},
      artwork: this.localizeDetail(localized.artwork, locale, ['authorNation', 'technique', 'materials', 'dimensions', 'location', 'collection', 'state']),
      artist: this.localizeDetail(localized.artist, locale, ['country', 'city', 'disciplines', 'bioShort', 'links']),
      concept: this.localizeDetail(localized.concept, locale, ['definition']),
      period: this.localizeDetail(localized.period, locale, ['definition']),
    };
  }

  private resolveDeckTranslation(deck: any, locale: string) {
    const translations = deck.translations ?? [];
    return translations.find((item: any) => item.locale === locale)
      ?? translations.find((item: any) => item.locale === 'es')
      ?? translations.find((item: any) => item.locale === 'en')
      ?? null;
  }

  private serializeDeck(deck: any, locale: string): CuratedDeck {
    const translation = this.resolveDeckTranslation(deck, locale);
    return {
      id: deck.id,
      slug: deck.slug,
      title: translation?.title?.trim() || deck.title,
      subtitle: translation?.subtitle?.trim() || deck.subtitle || null,
      description: translation?.description?.trim() || deck.description || null,
      image: deck.imageMedia
        ? {
            url: deck.imageMedia.displayUrl ?? deck.imageMedia.url,
            alt: deck.imageMedia.alt ?? deck.title,
          }
        : deck.imageUrl
          ? {
              url: deck.imageUrl,
              alt: deck.title,
            }
          : null,
      entityCount: deck.items?.length ?? 0,
      createdAt: deck.createdAt,
    };
  }

  private buildDiscoveryPool(decks: any[], locale: string) {
    const seen = new Set<string>();
    const entities: any[] = [];

    for (const deck of decks) {
      for (const item of deck.items ?? []) {
        if (!item.entity || !DISCOVERY_TYPES.includes(item.entity.type)) {
          continue;
        }

        if (seen.has(item.entity.id)) {
          continue;
        }

        seen.add(item.entity.id);
        entities.push(item.entity);
      }
    }

    return entities;
  }

  private async loadRelations(entityIds: string[], locale: string, take: number) {
    return this.prisma.relation.findMany({
      where: {
        type: { in: DISCOVERY_RELATION_TYPES },
        OR: [
          { fromId: { in: entityIds }, to: { status: EntityStatus.PUBLISHED } },
          { toId: { in: entityIds }, from: { status: EntityStatus.PUBLISHED } },
        ],
      },
      orderBy: [{ weight: 'desc' }, { id: 'asc' }],
      take,
      include: {
        from: { include: this.entityInclude(locale) },
        to: { include: this.entityInclude(locale) },
      },
    });
  }

  private collectCandidates(relations: any[], excludedIds: Set<string>, multiplier = 1) {
    const scores = new Map<string, CandidateScore>();

    for (const relation of relations) {
      const relationWeight = Number(relation.weight ?? 0.5);
      for (const entity of [relation.from, relation.to]) {
        if (!entity || excludedIds.has(entity.id)) {
          continue;
        }

        const typeBonus = CONCEPTUAL_TYPES.has(entity.type) ? 0.12 : entity.type === 'ARTWORK' || entity.type === 'ARTIST' ? 0.16 : 0;
        const relationBonus = KEY_RELATION_TYPES.has(relation.type) ? 0.18 : 0;
        const nextScore = relationWeight + typeBonus + relationBonus;
        const existing = scores.get(entity.id);
        const combined = (existing?.score ?? 0) + nextScore * multiplier;

        scores.set(entity.id, {
          entity,
          score: combined,
        });
      }
    }

    return scores;
  }

  private mergeCandidateMaps(base: Map<string, CandidateScore>, extra: Map<string, CandidateScore>) {
    const merged = new Map(base);
    for (const [entityId, candidate] of extra.entries()) {
      const existing = merged.get(entityId);
      merged.set(entityId, {
        entity: candidate.entity,
        score: (existing?.score ?? 0) + candidate.score,
      });
    }
    return merged;
  }

  private rankCandidates(candidates: Map<string, CandidateScore>) {
    return Array.from(candidates.values()).sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.entity.title.localeCompare(b.entity.title);
    });
  }

  private pickByType(candidates: CandidateScore[], types: string[], limit: number, locale: string) {
    const seen = new Set<string>();
    const allowedTypes = new Set(types);
    return candidates
      .filter((candidate) => allowedTypes.has(candidate.entity.type))
      .filter((candidate) => {
        if (seen.has(candidate.entity.id)) {
          return false;
        }
        seen.add(candidate.entity.id);
        return true;
      })
      .slice(0, limit)
      .map((candidate) => this.serializeEntity(candidate.entity, locale));
  }

  private pickDiverse(candidates: CandidateScore[], limit: number, excludedTypes: Set<string>, locale: string) {
    const selected: any[] = [];
    const selectedTypes = new Set<string>();
    const selectedIds = new Set<string>();

    for (const candidate of candidates) {
      if (selected.length >= limit) {
        break;
      }
      if (excludedTypes.has(candidate.entity.type) || selectedIds.has(candidate.entity.id)) {
        continue;
      }
      if (selectedTypes.has(candidate.entity.type) && selected.length < 4) {
        continue;
      }

      selected.push(candidate.entity);
      selectedTypes.add(candidate.entity.type);
      selectedIds.add(candidate.entity.id);
    }

    if (selected.length < limit) {
      for (const candidate of candidates) {
        if (selected.length >= limit) {
          break;
        }
        if (excludedTypes.has(candidate.entity.type) || selectedIds.has(candidate.entity.id)) {
          continue;
        }
        selected.push(candidate.entity);
        selectedIds.add(candidate.entity.id);
      }
    }

    return selected.map((entity) => this.serializeEntity(entity, locale));
  }
}
