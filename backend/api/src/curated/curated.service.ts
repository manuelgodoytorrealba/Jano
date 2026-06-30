import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus, HomeDeckSurface } from '@prisma/client';
import { normalizeLocale } from '../entities/entity-translation.resolver';
import { localizedInclude } from '../entities/entity.presenter';
import { PrismaService } from '../prisma/prisma.service';
import {
  canonicalRelationDirected,
  canonicalRelationKey,
  canonicalRelationTypeFilter,
} from '../relation-types/relation-type.utils';
import {
  collectCuratedCandidates,
  CONCEPTUAL_ENTITY_TYPES,
  CURATED_RELATION_TYPES,
  mergeCuratedCandidates,
  pickCuratedByType,
  pickDiverseCurated,
  rankCuratedCandidates,
  type RankedCandidate,
} from './curated-ranking';
import {
  presentCuratedDeck,
  presentCuratedEntity,
  type CuratedDeckRecord,
  type CuratedEntityRecord,
} from './curated.presenter';

const DISCOVERY_TYPES = new Set(['CONCEPT', 'MOVEMENT', 'PERIOD', 'ARTIST', 'ARTWORK']);

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

    const discoveryPool = this.buildDiscoveryPool(recommendedDecks);
    const initialEntity = discoveryPool[0];
    const resolvedSlug = selectedSlug?.trim() || initialEntity?.slug;

    if (!resolvedSlug) {
      return null;
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

    const selectedEntity = presentCuratedEntity(selectedEntityRecord, safeLocale);
    const selectedDecks = recommendedDecks
      .filter((deck) => deck.items.some((item) => item.entityId === selectedEntity.id))
      .map((deck) => presentCuratedDeck(deck, safeLocale));

    const directRelations = await this.loadRelations([selectedEntity.id], safeLocale, 48);
    const directCandidates = collectCuratedCandidates(
      directRelations,
      new Set([selectedEntity.id]),
    );
    const directNeighbors = rankCuratedCandidates(directCandidates);

    const bridgeSeedIds = directNeighbors.slice(0, 8).map((candidate) => candidate.entity.id);
    const bridgeRelations = bridgeSeedIds.length
      ? await this.loadRelations(bridgeSeedIds, safeLocale, 96)
      : [];
    const shelfCandidates = mergeCuratedCandidates(
      directCandidates,
      collectCuratedCandidates(
        bridgeRelations,
        new Set([selectedEntity.id, ...bridgeSeedIds]),
        0.62,
      ),
    );
    const rankedShelfCandidates = rankCuratedCandidates(shelfCandidates);

    const baseDiscovery = discoveryPool.slice(0, 20);
    const discoveryEntityMap = new Map(baseDiscovery.map((entity) => [entity.id, entity]));
    discoveryEntityMap.set(selectedEntity.id, selectedEntityRecord);

    const discoveryIds = Array.from(discoveryEntityMap.keys());
    const discoveryConnections = await this.prisma.relation.findMany({
      where: {
        ...canonicalRelationTypeFilter(CURATED_RELATION_TYPES),
        fromId: { in: discoveryIds },
        toId: { in: discoveryIds },
      },
      select: {
        id: true,
        fromId: true,
        toId: true,
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
        ...presentCuratedEntity(entity, safeLocale),
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
          entity.resolvedMedia?.thumbnail?.url ??
          entity.resolvedMedia?.card?.url ??
          entity.resolvedMedia?.primary?.url ??
          null,
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
      relationType: canonicalRelationKey(relation),
      directed: canonicalRelationDirected(relation),
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
      .map((deck) => presentCuratedDeck(deck, safeLocale));

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
        concepts: this.pickByType(rankedShelfCandidates, CONCEPTUAL_ENTITY_TYPES, 8, safeLocale),
      },
      keyEntities: this.pickDiverse(
        rankedShelfCandidates,
        6,
        new Set(['ARTICLE', 'TEXT', 'PLACE']),
        safeLocale,
      ),
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
      translations: localizedInclude(locale),
      mediaLinks: {
        include: { media: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
      artwork: {
        include: {
          translations: localizedInclude(locale),
        },
      },
      artist: {
        include: {
          translations: localizedInclude(locale),
        },
      },
      concept: {
        include: {
          translations: localizedInclude(locale),
        },
      },
      period: {
        include: {
          translations: localizedInclude(locale),
        },
      },
    };
  }

  private buildDiscoveryPool(decks: CuratedDeckRecord[]) {
    const seen = new Set<string>();
    const entities: CuratedEntityRecord[] = [];

    for (const deck of decks) {
      for (const item of deck.items ?? []) {
        if (!item.entity || !DISCOVERY_TYPES.has(item.entity.type)) {
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
        AND: [
          canonicalRelationTypeFilter(CURATED_RELATION_TYPES),
          {
            OR: [
              { fromId: { in: entityIds }, to: { status: EntityStatus.PUBLISHED } },
              { toId: { in: entityIds }, from: { status: EntityStatus.PUBLISHED } },
            ],
          },
        ],
      },
      orderBy: [{ weight: 'desc' }, { id: 'asc' }],
      take,
      include: {
        from: { include: this.entityInclude(locale) },
        to: { include: this.entityInclude(locale) },
        relationType: { select: { key: true, directed: true } },
      },
    });
  }

  private pickByType(
    candidates: RankedCandidate<CuratedEntityRecord>[],
    types: readonly string[],
    limit: number,
    locale: string,
  ) {
    return pickCuratedByType(candidates, types, limit).map((entity) =>
      presentCuratedEntity(entity, locale),
    );
  }

  private pickDiverse(
    candidates: RankedCandidate<CuratedEntityRecord>[],
    limit: number,
    excludedTypes: Set<string>,
    locale: string,
  ) {
    return pickDiverseCurated(candidates, limit, excludedTypes).map((entity) =>
      presentCuratedEntity(entity, locale),
    );
  }
}
