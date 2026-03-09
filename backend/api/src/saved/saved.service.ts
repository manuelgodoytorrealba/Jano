import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedService {
  constructor(private prisma: PrismaService) {}

  async listSaved(userId: string) {
    const rows = await this.prisma.savedEntity.findMany({
      where: { userId },
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
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      entity: row.entity,
    }));
  }

  async saveEntity(userId: string, entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const existing = await this.prisma.savedEntity.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Entity already saved');
    }

    const saved = await this.prisma.savedEntity.create({
      data: {
        userId,
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

    // Añadir automáticamente a la colección default si existe
    const defaultCollection = await this.prisma.collection.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      select: { id: true },
    });

    if (defaultCollection) {
      const existingCollectionItem = await this.prisma.collectionEntity.findFirst({
        where: {
          collectionId: defaultCollection.id,
          entityId,
        },
        select: { id: true },
      });

      if (!existingCollectionItem) {
        await this.prisma.collectionEntity.create({
          data: {
            collectionId: defaultCollection.id,
            entityId,
          },
        });
      }
    }

    return saved;
  }

  async removeSaved(userId: string, entityId: string) {
    const existing = await this.prisma.savedEntity.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Saved entity not found');
    }

    await this.prisma.savedEntity.delete({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    return { ok: true };
  }

  async isSaved(userId: string, entityId: string) {
    const existing = await this.prisma.savedEntity.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId,
        },
      },
    });

    return { saved: !!existing };
  }
}