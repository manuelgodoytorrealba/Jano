import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityAliasDto, type EntityAliasKindValue } from './dto/create-entity-alias.dto';
import { UpdateEntityAliasDto } from './dto/update-entity-alias.dto';
import { serializeRelation } from './entity.presenter';
import { EntityReadService } from './entity-read.service';
import { normalizeLocale } from './entity-translation.resolver';

type PrismaKnownError = { code?: string };

export type RelationMutationDto = {
  toId?: string;
  relationTypeId?: string;
  type?: string;
  justification?: string;
  justificationEs?: string;
  justificationEn?: string;
  weight?: number | null;
};

@Injectable()
export class EntityTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entities: EntityReadService,
  ) {}

  async createAlias(id: string, dto: CreateEntityAliasDto) {
    const entity = await this.prisma.entity.findUnique({ where: { id }, select: { id: true } });
    if (!entity) throw new NotFoundException('Entity not found');

    const value = dto.value?.trim();
    if (!value) throw new BadRequestException('Alias value is required');

    try {
      await this.prisma.entityAlias.create({
        data: {
          entityId: id,
          locale: this.aliasLocale(dto.locale),
          value,
          kind: dto.kind ?? ('COMMON_NAME' satisfies EntityAliasKindValue),
          weight: dto.weight ?? null,
          source: dto.source?.trim() || null,
        },
      });
    } catch (error) {
      if ((error as PrismaKnownError).code === 'P2002') {
        throw new ConflictException('Alias already exists for this entity');
      }
      throw error;
    }

    return this.entities.adminGetById(id);
  }

  async updateAlias(entityId: string, aliasId: string, dto: UpdateEntityAliasDto) {
    const alias = await this.prisma.entityAlias.findUnique({
      where: { id: aliasId },
      select: { id: true, entityId: true, value: true, locale: true, kind: true },
    });
    if (!alias || alias.entityId !== entityId) throw new NotFoundException('Alias not found');

    const value = dto.value !== undefined ? dto.value.trim() : alias.value;
    if (!value) throw new BadRequestException('Alias value is required');

    try {
      await this.prisma.entityAlias.update({
        where: { id: aliasId },
        data: {
          value,
          locale: dto.locale !== undefined ? this.aliasLocale(dto.locale) : alias.locale,
          kind: dto.kind ?? alias.kind,
          weight: dto.weight !== undefined ? (dto.weight ?? null) : undefined,
          source: dto.source !== undefined ? dto.source?.trim() || null : undefined,
        },
      });
    } catch (error) {
      if ((error as PrismaKnownError).code === 'P2002') {
        throw new ConflictException('Alias already exists for this entity');
      }
      throw error;
    }

    return this.entities.adminGetById(entityId);
  }

  async deleteAlias(entityId: string, aliasId: string) {
    const alias = await this.prisma.entityAlias.findUnique({
      where: { id: aliasId },
      select: { id: true, entityId: true },
    });
    if (!alias || alias.entityId !== entityId) throw new NotFoundException('Alias not found');

    await this.prisma.entityAlias.delete({ where: { id: aliasId } });
    return this.entities.adminGetById(entityId);
  }

  async createRelation(entityId: string, dto: RelationMutationDto) {
    const from = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!from) throw new NotFoundException('Origin entity not found');
    if (!dto.toId) throw new BadRequestException('Target entity is required');

    const to = await this.prisma.entity.findUnique({
      where: { id: dto.toId },
      select: { id: true },
    });
    if (!to) throw new NotFoundException('Target entity not found');

    const relationType = await this.findRelationType(dto);
    if (!relationType) throw new BadRequestException('Valid relation type is required');

    const relation = await this.prisma.relation.create({
      data: {
        fromId: entityId,
        toId: dto.toId,
        relationTypeId: relationType.id,
        justification: dto.justificationEs?.trim() || dto.justification?.trim() || undefined,
        weight: dto.weight,
      },
    });
    await this.upsertRelationTranslations(relation.id, dto);
    return this.getRelation(relation.id);
  }

  async updateRelation(entityId: string, relationId: string, dto: RelationMutationDto) {
    const existing = await this.prisma.relation.findFirst({
      where: { id: relationId, fromId: entityId },
      include: { relationType: true },
    });
    if (!existing) throw new NotFoundException('Relation not found');

    const relationType =
      dto.relationTypeId || dto.type ? await this.findRelationType(dto) : existing.relationType;
    if (!relationType) throw new BadRequestException('Valid relation type is required');
    await this.prisma.relation.update({
      where: { id: relationId },
      data: {
        relationTypeId: relationType.id,
        justification:
          dto.justificationEs !== undefined || dto.justification !== undefined
            ? dto.justificationEs?.trim() || dto.justification?.trim() || null
            : undefined,
        weight: dto.weight !== undefined ? dto.weight : undefined,
      },
    });
    await this.upsertRelationTranslations(relationId, dto);
    return this.getRelation(relationId);
  }

  async deleteRelation(entityId: string, relationId: string) {
    const relation = await this.prisma.relation.findFirst({
      where: { id: relationId, fromId: entityId },
      select: { id: true },
    });
    if (!relation) throw new NotFoundException('Relation not found');

    await this.prisma.relation.delete({ where: { id: relationId } });
    return { ok: true };
  }

  async addTag(entityId: string, dto: { tagId: string; weight?: number; source?: string }) {
    const [entity, tag] = await Promise.all([
      this.prisma.entity.findUnique({ where: { id: entityId }, select: { id: true } }),
      this.prisma.tag.findUnique({ where: { id: dto.tagId }, select: { id: true } }),
    ]);
    if (!entity) throw new NotFoundException('Entity not found');
    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.entityTag.upsert({
      where: { entityId_tagId: { entityId, tagId: dto.tagId } },
      update: { weight: dto.weight ?? null, source: dto.source?.trim() || 'MANUAL' },
      create: {
        entityId,
        tagId: dto.tagId,
        weight: dto.weight ?? null,
        source: dto.source?.trim() || 'MANUAL',
      },
      include: { tag: true },
    });
  }

  async removeTag(entityId: string, tagId: string) {
    const where = { entityId_tagId: { entityId, tagId } };
    const existing = await this.prisma.entityTag.findUnique({ where, select: { entityId: true } });
    if (!existing) throw new NotFoundException('Entity tag not found');

    await this.prisma.entityTag.delete({ where });
    return { ok: true };
  }

  private aliasLocale(locale?: string | null) {
    const value = locale?.trim().toLowerCase();
    return !value || value === 'und' ? 'und' : normalizeLocale(value);
  }

  private findRelationType(dto: RelationMutationDto) {
    if (dto.relationTypeId) {
      return this.prisma.relationType.findUnique({ where: { id: dto.relationTypeId } });
    }
    return dto.type
      ? this.prisma.relationType.findUnique({ where: { key: dto.type.trim() } })
      : null;
  }

  private async upsertRelationTranslations(relationId: string, dto: RelationMutationDto) {
    const justificationEs =
      dto.justificationEs !== undefined
        ? dto.justificationEs?.trim() || null
        : dto.justification?.trim() || null;
    const justificationEn = dto.justificationEn?.trim() || null;

    await Promise.all([
      this.prisma.relationTranslation.upsert({
        where: { relationId_locale: { relationId, locale: 'es' } },
        update: { justification: justificationEs },
        create: { relationId, locale: 'es', justification: justificationEs },
      }),
      this.prisma.relationTranslation.upsert({
        where: { relationId_locale: { relationId, locale: 'en' } },
        update: { justification: justificationEn },
        create: { relationId, locale: 'en', justification: justificationEn },
      }),
    ]);
  }

  private async getRelation(id: string) {
    const relation = await this.prisma.relation.findUniqueOrThrow({
      where: { id },
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: { select: { id: true, title: true, slug: true, type: true } },
      },
    });
    return serializeRelation(relation, 'es');
  }
}
