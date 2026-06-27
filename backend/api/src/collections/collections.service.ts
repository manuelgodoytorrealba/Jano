import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPlan } from '@prisma/client';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { attachResolvedMedia } from '../entities/media.resolver';

type CollectionItemWithEntity = {
  sortOrder?: number | null;
  entity?: CollectionEntityRecord | null;
} & Record<string, unknown>;

type CollectionRecord = {
  items?: CollectionItemWithEntity[] | null;
} & Record<string, unknown>;

type CollectionEntityRecord = Parameters<typeof attachResolvedMedia>[0] & {
  id: string;
  title: string;
  type: string;
  slug: string;
  summary?: string | null;
  startYear?: number | null;
  endYear?: number | null;
};

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  private readonly entityWithMediaInclude = {
    mediaLinks: {
      include: { media: true },
      orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    },
  };

  private readonly collectionInclude = {
    coverMedia: true,
    items: {
      orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
      include: {
        entity: {
          include: this.entityWithMediaInclude,
        },
      },
    },
  };

  private serializeCollection(collection: CollectionRecord, graph: unknown = null) {
    const items = (collection.items ?? []).map((item) => ({
      ...item,
      entity: item.entity ? attachResolvedMedia(item.entity) : item.entity,
    }));

    return {
      ...collection,
      items,
      itemCount: items.length,
      graph,
    };
  }

  private async assertCoverMediaExists(coverMediaId: string | null | undefined) {
    if (!coverMediaId) {
      return;
    }

    const media = await this.prisma.media.findUnique({
      where: { id: coverMediaId },
      select: { id: true },
    });

    if (!media) {
      throw new NotFoundException('Cover media not found');
    }
  }

  async list(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: this.collectionInclude,
    });

    return collections.map((collection) => this.serializeCollection(collection));
  }

  async getById(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      include: this.collectionInclude,
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const graph = await this.buildCollectionGraph(collection.items ?? []);
    return this.serializeCollection(collection, graph);
  }

  async create(userId: string, dto: CreateCollectionDto) {
    await this.assertCoverMediaExists(dto.coverMediaId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const count = await this.prisma.collection.count({
      where: { userId },
    });

    if (user.plan === UserPlan.FREE && count >= 1) {
      throw new ForbiddenException('Free plan allows only 1 collection');
    }

    const existing = await this.prisma.collection.findFirst({
      where: {
        userId,
        name: dto.name,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Collection name already exists');
    }

    const collection = await this.prisma.collection.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        notes: dto.notes?.trim() || null,
        coverMediaId: dto.coverMediaId?.trim() || null,
        isDefault: count === 0,
      },
      include: this.collectionInclude,
    });

    return this.serializeCollection(collection);
  }

  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: { id: true },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.assertCoverMediaExists(dto.coverMediaId);

    if (dto.name !== undefined) {
      const existing = await this.prisma.collection.findFirst({
        where: {
          userId,
          name: dto.name.trim(),
          id: {
            not: collectionId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('Collection name already exists');
      }
    }

    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
        coverMediaId: dto.coverMediaId !== undefined ? dto.coverMediaId?.trim() || null : undefined,
      },
      include: this.collectionInclude,
    });

    return this.serializeCollection(updated);
  }

  async addEntity(userId: string, collectionId: string, entityId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: { id: true },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const existing = await this.prisma.collectionEntity.findFirst({
      where: {
        collectionId,
        entityId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Entity already exists in collection');
    }

    const maxSort = await this.prisma.collectionEntity.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });

    const item = await this.prisma.collectionEntity.create({
      data: {
        collectionId,
        entityId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: {
        entity: {
          include: this.entityWithMediaInclude,
        },
      },
    });

    return {
      ...item,
      entity: item.entity ? attachResolvedMedia(item.entity) : item.entity,
    };
  }

  async reorderEntity(userId: string, collectionId: string, entityId: string, sortOrder: number) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: { id: true },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const item = await this.prisma.collectionEntity.findFirst({
      where: {
        collectionId,
        entityId,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    return this.prisma.collectionEntity.update({
      where: { id: item.id },
      data: { sortOrder },
    });
  }

  async removeEntity(userId: string, collectionId: string, entityId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
      select: { id: true },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const item = await this.prisma.collectionEntity.findFirst({
      where: {
        collectionId,
        entityId,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    await this.prisma.collectionEntity.delete({
      where: { id: item.id },
    });

    return { ok: true };
  }

  private async buildCollectionGraph(items: CollectionItemWithEntity[]) {
    const nodes = items
      .filter(
        (item): item is CollectionItemWithEntity & { entity: CollectionEntityRecord } =>
          !!item.entity,
      )
      .map((item) => {
        const entity = attachResolvedMedia(item.entity);
        return {
          id: entity.id,
          label: entity.title,
          type: entity.type,
          slug: entity.slug,
          sortOrder: item.sortOrder ?? 0,
          resolvedMedia: entity.resolvedMedia,
          metadata: {
            summary: entity.summary ?? null,
            startYear: entity.startYear ?? null,
            endYear: entity.endYear ?? null,
          },
        };
      });

    const nodeIds = nodes.map((node) => node.id);
    const nodeIdSet = new Set(nodeIds);

    const relations = nodeIds.length
      ? await this.prisma.relation.findMany({
          where: {
            fromId: { in: nodeIds },
            toId: { in: nodeIds },
          },
          orderBy: [{ type: 'asc' }, { id: 'asc' }],
        })
      : [];

    const edges = relations
      .filter((relation) => nodeIdSet.has(relation.fromId) && nodeIdSet.has(relation.toId))
      .map((relation) => ({
        id: relation.id,
        source: relation.fromId,
        target: relation.toId,
        relationType: relation.type,
        weight: relation.weight ?? 1,
        justification: relation.justification ?? null,
      }));

    return {
      nodes,
      edges,
      summary: {
        entityTypes: this.countBy(nodes.map((node) => node.type)),
        relationTypes: this.countBy(
          edges.map((edge) => edge.relationType).filter((value): value is string => !!value),
        ),
      },
    };
  }

  private countBy(values: string[]) {
    return values.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  }
}
