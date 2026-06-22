import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async list(locale?: string) {
    const requestedLocale = (locale ?? 'es').trim().toLowerCase().split('-')[0];
    const tags = await this.prisma.tag.findMany({
      include: {
        translations: {
          where: { locale: { in: Array.from(new Set([requestedLocale, 'es', 'en'])) } },
        },
      },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });

    return tags.map((tag: any) => {
      const resolved =
        tag.translations.find((item: any) => item.locale === requestedLocale) ??
        tag.translations.find((item: any) => item.locale === 'es') ??
        tag.translations.find((item: any) => item.locale === 'en') ??
        null;

      return {
        ...tag,
        label: resolved?.label?.trim() || tag.label,
        description: resolved?.description?.trim() || tag.description,
      };
    });
  }

  async create(dto: CreateTagDto) {
    const slug = this.slugify(dto.slug || dto.label);
    const existing = await this.prisma.tag.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Tag slug already exists');
    }

    return this.prisma.tag.create({
      data: {
        slug,
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
