import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchSourcesQuery } from './dto/search-sources.query';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  search(query: SearchSourcesQuery) {
    const q = query.q?.trim();
    const contains = q ? { contains: q, mode: 'insensitive' as const } : undefined;

    return this.prisma.source.findMany({
      where: contains
        ? {
            OR: [
              { title: contains },
              { author: contains },
              { publisher: contains },
              { url: contains },
              {
                translations: {
                  some: {
                    OR: [{ title: contains }, { author: contains }, { publisher: contains }],
                  },
                },
              },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 8,
      include: { translations: { orderBy: { locale: 'asc' } } },
    });
  }
}
