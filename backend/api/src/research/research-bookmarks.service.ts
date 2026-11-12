import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const publicationBookmarkSelect = {
  id: true,
  title: true,
  objective: true,
  coverImageUrl: true,
  publishedAt: true,
} as const;

@Injectable()
export class ResearchBookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPublished(researchId: string) {
    if (
      !(await this.prisma.researchProject.findFirst({
        where: { id: researchId, status: 'PUBLISHED' },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Publication not found');
  }

  private async assertCollection(userId: string, collectionId: string) {
    if (
      !(await this.prisma.collection.findFirst({
        where: { id: collectionId, userId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Collection not found');
  }

  list(userId: string) {
    return this.prisma.savedResearchPublication.findMany({
      where: { userId, research: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        researchId: true,
        createdAt: true,
        research: { select: publicationBookmarkSelect },
      },
    });
  }

  async check(userId: string, researchId: string) {
    await this.assertPublished(researchId);
    return {
      saved: !!(await this.prisma.savedResearchPublication.findUnique({
        where: { userId_researchId: { userId, researchId } },
      })),
    };
  }

  async save(userId: string, researchId: string) {
    await this.assertPublished(researchId);
    await this.prisma.savedResearchPublication.upsert({
      where: { userId_researchId: { userId, researchId } },
      create: { userId, researchId },
      update: {},
    });
    return { saved: true };
  }

  async remove(userId: string, researchId: string) {
    await this.prisma.savedResearchPublication.deleteMany({ where: { userId, researchId } });
    return { ok: true };
  }

  async addToCollection(userId: string, collectionId: string, researchId: string) {
    await this.assertCollection(userId, collectionId);
    await this.assertPublished(researchId);
    await this.prisma.collectionResearchPublication.upsert({
      where: { collectionId_researchId: { collectionId, researchId } },
      create: { collectionId, researchId },
      update: {},
    });
    return { ok: true };
  }

  async removeFromCollection(userId: string, collectionId: string, researchId: string) {
    await this.assertCollection(userId, collectionId);
    await this.prisma.collectionResearchPublication.deleteMany({
      where: { collectionId, researchId },
    });
    return { ok: true };
  }
}
