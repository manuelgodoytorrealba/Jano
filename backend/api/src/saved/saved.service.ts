import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { attachResolvedMedia } from '../entities/media.resolver';

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
              orderBy: [
                { sortOrder: 'asc' },
                { id: 'asc' },
              ],
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      entity: attachResolvedMedia(row.entity),
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
              orderBy: [
                { sortOrder: 'asc' },
                { id: 'asc' },
              ],
            },
          },
        },
      },
    });

    return {
      ...saved,
      entity: saved.entity ? attachResolvedMedia(saved.entity) : saved.entity,
    };
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
