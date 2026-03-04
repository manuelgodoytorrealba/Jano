import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';

@Injectable()
export class EntitiesService {
  private readonly HOME_TYPES: EntityType[] = [
    'ARTWORK',
    'PERIOD',
    'MOVEMENT',
    'CONCEPT',
    'ARTIST',
  ];

  constructor(private prisma: PrismaService) {}

  async list(query: ListEntitiesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.type) where.type = query.type;

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const orderBy =
  query.sort === 'title'
    ? ({ title: 'asc' as const })
    : ({ createdAt: 'desc' as const });

    const [items, total] = await Promise.all([
      this.prisma.entity.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          mediaLinks: {
            include: { media: true },
            where: { role: 'PRIMARY' as any },
            take: 1,
          },
        },
      }),
      this.prisma.entity.count({ where }),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  // ✅ Home optimizado: 1 por tipo, orden fijo
  async home() {
    const results = await Promise.all(
      this.HOME_TYPES.map((type) =>
        this.prisma.entity.findFirst({
          where: { type },
          orderBy: { createdAt: 'desc' },
          include: {
            mediaLinks: {
              include: { media: true },
              where: { role: 'PRIMARY' as any },
              take: 1,
            },
          },
        }),
      ),
    );

    return results.filter(Boolean);
  }

  // lo demás igual
  async getBySlug(slug: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { slug },
      include: {
        artwork: true,
        artist: true,
        concept: true,
        period: true,
        mediaLinks: { include: { media: true } },
        contributors: true,
        sourceRefs: { include: { source: true } },
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
      weight: r.weight,
      justification: r.justification,
    }));

    return { centerId: center.id, nodes, edges };
  }

  async previewBySlug(slug: string) {
    const e = await this.prisma.entity.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        summary: true,
        status: true,
        contentLevel: true,
        startYear: true,
        endYear: true,
        mediaLinks: {
          take: 1,
          where: { role: 'PRIMARY' as any },
          select: { media: { select: { url: true, alt: true } } },
        },
      },
    });

    if (!e) throw new NotFoundException('Entity not found');
    return e;
  }
}