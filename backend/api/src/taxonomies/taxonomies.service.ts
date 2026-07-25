import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxonomyDto, CreateTaxonomyTermDto } from './dto/taxonomy.dto';

@Injectable()
export class TaxonomiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.taxonomy.findMany({
      where: { isActive: true },
      include: {
        terms: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
      orderBy: [{ label: 'asc' }],
    });
  }

  async get(key: string) {
    const taxonomy = await this.prisma.taxonomy.findUnique({
      where: { key },
      include: {
        terms: {
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });
    if (!taxonomy) throw new NotFoundException('Taxonomy not found');
    return taxonomy;
  }

  async create(dto: CreateTaxonomyDto) {
    const key = dto.key.trim();
    const existing = await this.prisma.taxonomy.findUnique({
      where: { key },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Taxonomy key already exists');

    return this.prisma.taxonomy.create({
      data: {
        key,
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async createTerm(taxonomyKey: string, dto: CreateTaxonomyTermDto) {
    const taxonomy = await this.prisma.taxonomy.findUnique({
      where: { key: taxonomyKey },
      select: { id: true },
    });
    if (!taxonomy) throw new NotFoundException('Taxonomy not found');

    if (dto.parentId) {
      const parent = await this.prisma.taxonomyTerm.findFirst({
        where: { id: dto.parentId, taxonomyId: taxonomy.id },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Taxonomy parent term not found');
    }

    try {
      return await this.prisma.taxonomyTerm.create({
        data: {
          taxonomyId: taxonomy.id,
          key: dto.key.trim(),
          label: dto.label.trim(),
          description: dto.description?.trim() || null,
          parentId: dto.parentId || null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Taxonomy term key already exists');
      }
      throw error;
    }
  }
}
