import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityStatus } from '@prisma/client';
import { resolvedMediaUrl, type ResolvedMediaPayload } from '../media/media.resolver';
import { PrismaService } from '../prisma/prisma.service';
import {
  canonicalRelationDirected,
  canonicalRelationKey,
} from '../relation-types/relation-type.utils';
import { normalizeLocale, resolveEntityTranslation } from './entity-translation.resolver';
import {
  localizedInclude,
  relationDisplayLabel,
  relationLabel,
  resolveLocalizedEntity,
  translationField,
} from './entity.presenter';

type LocalizedEntityRecord = Parameters<typeof resolveLocalizedEntity>[0];

type GraphEntityNodeRecord = LocalizedEntityRecord & {
  id: string;
  type: string;
  kind?: string | null;
  slug: string;
  startYear?: number | null;
  endYear?: number | null;
};

type GraphNodePayload = {
  id: string;
  label: string;
  type: string;
  kind: string | null;
  slug: string;
  image: string | null;
  resolvedMedia?: ResolvedMediaPayload;
  metadata: {
    summary: string | null;
    startYear: number | null;
    endYear: number | null;
  };
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

@Injectable()
export class EntityGraphService {
  constructor(private readonly prisma: PrismaService) {}

  private graphMediaInclude(locale?: string) {
    return {
      translations: localizedInclude(locale),
      mediaLinks: {
        include: { media: true },
        orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      },
    };
  }

  private toGraphNodePayload(node: GraphEntityNodeRecord, locale?: string): GraphNodePayload {
    const resolvedNode = resolveLocalizedEntity(node, locale);
    const image =
      resolvedMediaUrl(resolvedNode.resolvedMedia.thumbnail) ??
      resolvedMediaUrl(resolvedNode.resolvedMedia.card) ??
      resolvedMediaUrl(resolvedNode.resolvedMedia.detail) ??
      resolvedMediaUrl(resolvedNode.resolvedMedia.hero) ??
      resolvedMediaUrl(resolvedNode.resolvedMedia.explorer3d) ??
      resolvedMediaUrl(resolvedNode.resolvedMedia.primary);

    return {
      id: node.id,
      label: resolvedNode.title,
      type: node.type,
      kind: node.kind ?? null,
      slug: node.slug,
      image: image ?? null,
      resolvedMedia: resolvedNode.resolvedMedia,
      metadata: {
        summary: resolvedNode.summary ?? null,
        startYear: node.startYear ?? null,
        endYear: node.endYear ?? null,
      },
    };
  }

  private toWorkspaceGraphNodePayload(
    node: GraphEntityNodeRecord,
    locale?: string,
  ): GraphNodePayload {
    const resolvedNode = resolveEntityTranslation(node, locale);

    return {
      id: node.id,
      label: resolvedNode.title,
      type: node.type,
      kind: node.kind ?? null,
      slug: node.slug,
      image: null,
      metadata: {
        summary: resolvedNode.summary ?? null,
        startYear: node.startYear ?? null,
        endYear: node.endYear ?? null,
      },
    };
  }

  async graphBySlug(slug: string, locale?: string) {
    const graphMediaInclude = this.graphMediaInclude(locale);
    const center = await this.prisma.entity.findFirst({
      where: { slug, status: EntityStatus.PUBLISHED },
      include: graphMediaInclude,
    });

    if (!center) throw new NotFoundException('Entity not found');

    const relations = await this.prisma.relation.findMany({
      where: {
        status: EntityStatus.PUBLISHED,
        OR: [
          { fromId: center.id, to: { status: EntityStatus.PUBLISHED } },
          { toId: center.id, from: { status: EntityStatus.PUBLISHED } },
        ],
      },
      select: {
        id: true,
        fromId: true,
        toId: true,
        weight: true,
        justification: true,
        relationType: {
          select: {
            key: true,
            label: true,
            inverseLabel: true,
            directed: true,
            translations: localizedInclude(locale),
          },
        },
        translations: localizedInclude(locale),
      },
    });

    const relatedNodeIds = Array.from(
      new Set(relations.flatMap((relation) => [relation.fromId, relation.toId])),
    ).filter((id) => id !== center.id);
    const relatedNodes = relatedNodeIds.length
      ? await this.prisma.entity.findMany({
          where: { id: { in: relatedNodeIds }, status: EntityStatus.PUBLISHED },
          include: graphMediaInclude,
        })
      : [];
    const nodesMap = new Map<string, GraphNodePayload>();
    const entityMap = new Map<string, GraphEntityNodeRecord>([
      [center.id, center],
      ...relatedNodes.map((node) => [node.id, node] as const),
    ]);

    nodesMap.set(center.id, this.toGraphNodePayload(center, locale));
    for (const relation of relations) {
      const fromNode = entityMap.get(relation.fromId);
      const toNode = entityMap.get(relation.toId);
      if (!fromNode || !toNode) continue;
      nodesMap.set(fromNode.id, this.toGraphNodePayload(fromNode, locale));
      nodesMap.set(toNode.id, this.toGraphNodePayload(toNode, locale));
    }

    const nodes = Array.from(nodesMap.values()).sort((a, b) => {
      if (a.id === center.id) return -1;
      if (b.id === center.id) return 1;
      return a.label.localeCompare(b.label, normalizeLocale(locale));
    });
    const edges: GraphEdgePayload[] = relations.map((relation) => ({
      id: relation.id,
      source: relation.fromId,
      target: relation.toId,
      relationType: canonicalRelationKey(relation),
      label: relationDisplayLabel(relation, locale),
      directed: canonicalRelationDirected(relation),
      weight: relation.weight ?? 1,
      justification:
        translationField(relation, locale, 'justification') ?? relation.justification ?? null,
    }));

    return {
      centerId: center.id,
      nodes,
      edges,
      filters: {
        entityTypes: Array.from(new Set(nodes.map((node) => node.type))).sort(),
        entityKinds: Array.from(
          new Set(nodes.map((node) => node.kind).filter((kind): kind is string => !!kind)),
        ).sort(),
        relationTypes: Array.from(new Set(edges.map((edge) => edge.relationType))).sort(),
      },
    };
  }

  async adminWorkspaceGraph(locale?: string) {
    const entities = await this.prisma.entity.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        type: true,
        kind: true,
        slug: true,
        summary: true,
        startYear: true,
        endYear: true,
        translations: localizedInclude(locale),
      },
    });
    const entityIds = entities.map((entity) => entity.id);
    const entityIdSet = new Set(entityIds);
    const relations = entityIds.length
      ? await this.prisma.relation.findMany({
          where: { fromId: { in: entityIds }, toId: { in: entityIds } },
          select: {
            id: true,
            fromId: true,
            toId: true,
            weight: true,
            justification: true,
            relationType: {
              select: {
                key: true,
                label: true,
                inverseLabel: true,
                directed: true,
                translations: localizedInclude(locale),
              },
            },
            translations: localizedInclude(locale),
          },
        })
      : [];
    const typeDefinitions = await this.prisma.entityTypeDefinition.findMany({
      select: { key: true, singularName: true },
      orderBy: [{ systemType: 'desc' }, { singularName: 'asc' }],
    });
    const typeLabels = new Map(typeDefinitions.map((type) => [type.key, type.singularName]));
    const entityTypes = typeDefinitions.map((type) => type.key);
    const nodes: GraphNodePayload[] = [
      {
        id: 'workspace-center-jano',
        label: 'JANO',
        type: 'CONCEPT',
        kind: 'ABSTRACTION',
        slug: 'workspace-jano',
        image: null,
        metadata: {
          summary: 'Centro editorial del mapa global de conocimiento de JANO.',
          startYear: null,
          endYear: null,
        },
      },
      ...entityTypes.map((type) => ({
        id: `workspace-type-${type}`,
        label: typeLabels.get(type) ?? type,
        type,
        kind: null,
        slug: `workspace-type-${type.toLowerCase()}`,
        image: null,
        metadata: {
          summary: `Tipo editorial ${typeLabels.get(type) ?? type} en JANO.`,
          startYear: null,
          endYear: null,
        },
      })),
      ...entities.map((entity) => this.toWorkspaceGraphNodePayload(entity, locale)),
    ];
    const edgesMap = new Map<string, GraphEdgePayload>();

    for (const type of entityTypes) {
      edgesMap.set(`workspace-center-${type}`, {
        id: `workspace-center-${type}`,
        source: 'workspace-center-jano',
        target: `workspace-type-${type}`,
        relationType: 'ASSOCIATED_WITH',
        label: relationLabel('ASSOCIATED_WITH'),
        directed: false,
        weight: 0.8,
        justification: 'Cluster editorial de JANO.',
      });
    }

    for (const entity of entities) {
      edgesMap.set(`workspace-hub-${entity.id}`, {
        id: `workspace-hub-${entity.id}`,
        source: `workspace-type-${entity.type}`,
        target: entity.id,
        relationType: 'PART_OF',
        label: relationLabel('PART_OF'),
        directed: true,
        weight: 0.7,
        justification: `${entity.title} pertenece al tipo editorial ${typeLabels.get(entity.type) ?? entity.type}.`,
      });
    }

    for (const relation of relations) {
      if (!entityIdSet.has(relation.fromId) || !entityIdSet.has(relation.toId)) continue;
      edgesMap.set(relation.id, {
        id: relation.id,
        source: relation.fromId,
        target: relation.toId,
        relationType: canonicalRelationKey(relation),
        label: relationDisplayLabel(relation, locale),
        directed: canonicalRelationDirected(relation),
        weight: relation.weight ?? 1,
        justification:
          translationField(relation, locale, 'justification') ?? relation.justification ?? null,
      });
    }

    const edges = Array.from(edgesMap.values());
    return {
      centerId: 'workspace-center-jano',
      nodes,
      edges,
      filters: {
        entityTypes: Array.from(new Set(nodes.map((node) => node.type))).sort(),
        entityKinds: Array.from(
          new Set(nodes.map((node) => node.kind).filter((kind): kind is string => !!kind)),
        ).sort(),
        relationTypes: Array.from(new Set(edges.map((edge) => edge.relationType))).sort(),
      },
    };
  }
}
