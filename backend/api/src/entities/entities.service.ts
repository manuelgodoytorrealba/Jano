import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';
import { ContentLevel, EntityStatus } from '@prisma/client';

@Injectable()
export class EntitiesService {
  private readonly HOME_TYPES: EntityType[] = [
    'ARTWORK',
    'PERIOD',
    'MOVEMENT',
    'CONCEPT',
    'ARTIST',
  ];

  constructor(private prisma: PrismaService) { }

  async list(query: ListEntitiesQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 24);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 24;

    const skip = (safePage - 1) * safeLimit;

    const q = (query.q ?? '').trim();
    const status = (query.status ?? '').trim();
    const contentLevel = (query.contentLevel ?? '').trim();
    const sort = (query.sort ?? 'recent').trim(); // recent | title | relevance

    const where: any = {};
    if (query.type) where.type = query.type;

    // Enums: solo aceptar si son válidos (evita 500 Prisma)
    if (status && Object.values(EntityStatus).includes(status as EntityStatus)) {
      where.status = status as EntityStatus;
    }

    if (
      contentLevel &&
      Object.values(ContentLevel).includes(contentLevel as ContentLevel)
    ) {
      where.contentLevel = contentLevel as ContentLevel;
    }

    // Search (solo si hay q real)
    const qValid = q && q !== 'undefined' && q !== 'null';
    if (qValid) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.entity.count({ where });

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const useRelevance = sort === 'relevance' && !!qValid;

    // OrderBy “normal”
    const orderBy =
      sort === 'title'
        ? ({ title: 'asc' as const })
        : ({ createdAt: 'desc' as const });

    // ✅ Camino normal (recent/title)
    if (!useRelevance) {
      const items = await this.prisma.entity.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy,
        include: {
          mediaLinks: {
            include: { media: true },
            where: { role: 'PRIMARY' as any },
            take: 1,
          },
        },
      });

      return {
        items,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      };
    }

    // ✅ Camino relevance (heurística + paginación)
    // Traemos un buffer grande y rankeamos en memoria (MVP)
    // Para no traer demasiado:
    // - mínimo 120
    // - máximo 500
    // - crece con page para permitir paginar por relevancia
    const fetchSize = Math.min(500, Math.max(120, safePage * safeLimit * 5));

    const raw = await this.prisma.entity.findMany({
      where,
      take: fetchSize,
      orderBy: { createdAt: 'desc' },
      include: {
        mediaLinks: {
          include: { media: true },
          where: { role: 'PRIMARY' as any },
          take: 1,
        },
      },
    });

    const needle = q.toLowerCase();

    const score = (e: any) => {
      const t = (e.title ?? '').toLowerCase();
      const s = (e.summary ?? '').toLowerCase();
      const c = (e.content ?? '').toLowerCase();

      let sc = 0;

      // Title pesa más
      if (t.includes(needle)) sc += 6;
      if (t.startsWith(needle)) sc += 4;

      // Summary pesa menos
      if (s.includes(needle)) sc += 2;

      // Content pesa mínimo (pero ayuda mucho a “arte”, “historia”, etc.)
      if (c.includes(needle)) sc += 1;

      return sc;
    };

    const ranked = raw
      .map((e) => ({ e, sc: score(e) }))
      .sort((a, b) => {
        // Score desc
        if (b.sc !== a.sc) return b.sc - a.sc;
        // fallback: más reciente primero
        return (
          new Date(b.e.createdAt).getTime() - new Date(a.e.createdAt).getTime()
        );
      })
      .map((x) => x.e);

    const items = ranked.slice(skip, skip + safeLimit);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    };
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