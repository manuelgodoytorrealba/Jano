import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListEntitiesQuery, EntityType } from './dto/list-entities.query';
import { ContentLevel, EntityStatus } from '@prisma/client';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

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

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 24);

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 24;

    const skip = (safePage - 1) * safeLimit;

    const q = (query.q ?? '').trim();
    const status = (query.status ?? '').trim();
    const contentLevel = (query.contentLevel ?? '').trim();
    const sort = (query.sort ?? 'recent').trim();

    const where: any = {};

    if (query.type) where.type = query.type;

    if (status && Object.values(EntityStatus).includes(status as EntityStatus)) {
      where.status = status as EntityStatus;
    }

    if (contentLevel && Object.values(ContentLevel).includes(contentLevel as ContentLevel)) {
      where.contentLevel = contentLevel as ContentLevel;
    }

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

    const orderBy =
      sort === 'title'
        ? { title: 'asc' as const }
        : { createdAt: 'desc' as const };

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

      if (t.includes(needle)) sc += 6;
      if (t.startsWith(needle)) sc += 4;

      if (s.includes(needle)) sc += 2;

      if (c.includes(needle)) sc += 1;

      return sc;
    };

    const ranked = raw
      .map((e) => ({ e, sc: score(e) }))
      .sort((a, b) => {

        if (b.sc !== a.sc) return b.sc - a.sc;

        return (
          new Date(b.e.createdAt).getTime() -
          new Date(a.e.createdAt).getTime()
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

    const center = await this.prisma.entity.findUnique({
      where: { slug },
    });

    if (!center) throw new NotFoundException('Entity not found');

    const relations = await this.prisma.relation.findMany({
      where: {
        OR: [
          { fromId: center.id },
          { toId: center.id },
        ],
      },
      include: {
        from: true,
        to: true,
      },
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

    return {
      centerId: center.id,
      nodes,
      edges,
    };
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
          select: {
            media: {
              select: {
                url: true,
                alt: true,
              },
            },
          },
        },
      },
    });

    if (!e) throw new NotFoundException('Entity not found');

    return e;
  }

  async adminCreate(dto: CreateEntityDto) {

    const existing = await this.prisma.entity.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const entity = await this.prisma.entity.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        summary: dto.summary?.trim(),
        content: dto.content?.trim(),
        contentLevel: dto.contentLevel,
        status: dto.status ?? 'DRAFT',
        startYear: dto.startYear,
        endYear: dto.endYear,
      },
    });

    await this.syncContentRelations(entity.id, entity.content);

    return entity;
  }

  async adminUpdate(id: string, dto: UpdateEntityDto) {

    const existing = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Entity not found');
    }

    if (dto.slug) {

      const slugOwner = await this.prisma.entity.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });

      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException('Slug already exists');
      }
    }

    const entity = await this.prisma.entity.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title?.trim(),
        slug: dto.slug?.trim(),
        summary: dto.summary?.trim(),
        content: dto.content?.trim(),
        contentLevel: dto.contentLevel,
        status: dto.status,
        startYear: dto.startYear,
        endYear: dto.endYear,
      },
    });

    await this.syncContentRelations(entity.id, entity.content);

    return entity;
  }

  async adminDelete(id: string) {

    const existing = await this.prisma.entity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Entity not found');
    }

    await this.prisma.entity.delete({
      where: { id },
    });

    return { ok: true };
  }

  async adminGetById(id: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return entity;
  }

  async adminListRelations(entityId: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.relation.findMany({
      where: { fromId: entityId },
      orderBy: { type: 'asc' },
      include: {
        to: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });
  }

  async adminCreateRelation(entityId: string, dto: any) {

    const from = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!from) {
      throw new NotFoundException('Origin entity not found');
    }

    const to = await this.prisma.entity.findUnique({
      where: { id: dto.toId },
      select: { id: true },
    });

    if (!to) {
      throw new NotFoundException('Target entity not found');
    }

    return this.prisma.relation.create({
      data: {
        fromId: entityId,
        toId: dto.toId,
        type: dto.type.trim(),
        justification: dto.justification?.trim() || undefined,
        weight: dto.weight,
      },
      include: {
        to: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });
  }

  async adminDeleteRelation(entityId: string, relationId: string) {

    const relation = await this.prisma.relation.findFirst({
      where: {
        id: relationId,
        fromId: entityId,
      },
      select: { id: true },
    });

    if (!relation) {
      throw new NotFoundException('Relation not found');
    }

    await this.prisma.relation.delete({
      where: { id: relationId },
    });

    return { ok: true };
  }

  async adminListIncomingRelations(entityId: string) {

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return this.prisma.relation.findMany({
      where: { toId: entityId },
      orderBy: { type: 'asc' },
      include: {
        from: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
          },
        },
      },
    });
  }

  private extractEntityLinks(content: string | null | undefined): string[] {
  if (!content) return [];

  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  const slugs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const slug = (match[1] ?? '').trim();
    if (slug) slugs.push(slug);
  }

  return [...new Set(slugs)];
}

  private async syncContentRelations(entityId: string, content: string | null) {
  const slugs = this.extractEntityLinks(content);

  const targets = slugs.length
    ? await this.prisma.entity.findMany({
        where: {
          slug: {
            in: slugs,
          },
          id: {
            not: entityId,
          },
        },
        select: {
          id: true,
          slug: true,
        },
      })
    : [];

  const targetIds = new Set(targets.map((t) => t.id));

  const existingMentions = await this.prisma.relation.findMany({
    where: {
      fromId: entityId,
      type: 'MENTIONS',
    },
    select: {
      id: true,
      toId: true,
    },
  });

  const existingTargetIds = new Set(existingMentions.map((r) => r.toId));

  // Crear nuevas relaciones que no existían
  for (const target of targets) {
    if (!existingTargetIds.has(target.id)) {
      await this.prisma.relation.create({
        data: {
          fromId: entityId,
          toId: target.id,
          type: 'MENTIONS',
        },
      });
    }
  }

  // Eliminar relaciones antiguas que ya no están en el contenido
  for (const relation of existingMentions) {
    if (!targetIds.has(relation.toId)) {
      await this.prisma.relation.delete({
        where: {
          id: relation.id,
        },
      });
    }
  }
}
}