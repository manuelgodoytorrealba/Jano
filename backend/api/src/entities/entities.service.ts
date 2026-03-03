import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.entity.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySlug(slug: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { slug },
      include: {
        outgoing: { include: { to: true } },
        incoming: { include: { from: true } },
      },
    });

    if (!entity) throw new NotFoundException('Entity not found');
    return entity;
  }

  async graphBySlug(slug: string) {
    const center = await this.prisma.entity.findUnique({ where: { slug } });
    if (!center) throw new NotFoundException('Entity not found');

    const relations = await this.prisma.relation.findMany({
      where: { OR: [{ fromId: center.id }, { toId: center.id }] },
      include: { from: true, to: true },
    });

    const nodesMap = new Map<string, any>();
    nodesMap.set(center.id, center);

    for (const r of relations) {
      nodesMap.set(r.from.id, r.from);
      nodesMap.set(r.to.id, r.to);
    }

    const nodes = Array.from(nodesMap.values()).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      slug: n.slug,
    }));

    const edges = relations.map((r) => ({
      id: r.id,
      from: r.fromId,
      to: r.toId,
      type: r.type,
      note: r.note,
      weight: r.weight,
    }));

    return { centerId: center.id, nodes, edges };
  }
}