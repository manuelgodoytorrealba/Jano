import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPlan } from '@prisma/client';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            entity: {
              include: {
                mediaLinks: {
                  include: { media: true },
                  where: { role: 'PRIMARY' as any },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  async create(userId: string, dto: CreateCollectionDto) {
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

    return this.prisma.collection.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        isDefault: count === 0,
      },
      include: {
        items: {
          include: {
            entity: {
              include: {
                mediaLinks: {
                  include: { media: true },
                  where: { role: 'PRIMARY' as any },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
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

    return this.prisma.collectionEntity.create({
      data: {
        collectionId,
        entityId,
      },
      include: {
        entity: {
          include: {
            mediaLinks: {
              include: { media: true },
              where: { role: 'PRIMARY' as any },
              take: 1,
            },
          },
        },
      },
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
}