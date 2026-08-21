import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType, EntityTypeStatus, KnowledgeEntityKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalRelationTypeFilter } from '../relation-types/relation-type.utils';
import { CreateEntityDraftDto } from './dto/create-entity-draft.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDetailsDto } from './dto/update-entity-details.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { UpsertEntityTranslationDto } from './dto/upsert-entity-translation.dto';
import { EntityReadService } from './entity-read.service';
import { normalizeLocale } from './entity-translation.resolver';

const LEGACY_ENTITY_KIND: Record<EntityType, KnowledgeEntityKind> = {
  ARTIST: KnowledgeEntityKind.PERSON,
  ARTWORK: KnowledgeEntityKind.WORK,
  ARTICLE: KnowledgeEntityKind.WORK,
  TEXT: KnowledgeEntityKind.WORK,
  CONCEPT: KnowledgeEntityKind.ABSTRACTION,
  MOVEMENT: KnowledgeEntityKind.ABSTRACTION,
  PERIOD: KnowledgeEntityKind.ABSTRACTION,
  PLACE: KnowledgeEntityKind.PLACE,
  EVENT: KnowledgeEntityKind.EVENT,
  ORGANIZATION: KnowledgeEntityKind.ORGANIZATION,
};

export function kindForLegacyEntityType(type: EntityType): KnowledgeEntityKind {
  return LEGACY_ENTITY_KIND[type];
}

@Injectable()
export class EntityEditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entities: EntityReadService,
  ) {}

  createDraft(dto: CreateEntityDraftDto) {
    return this.create({
      type: dto.type,
      kind: dto.kind,
      title: 'Sin título',
      slug: '_draft-' + randomUUID(),
      status: 'DRAFT',
    });
  }

  createDraftRecord(
    tx: Prisma.TransactionClient,
    dto: { type: string; kind: KnowledgeEntityKind; title: string; summary?: string },
  ) {
    const title = dto.title.trim();
    const summary = dto.summary?.trim() || null;
    return tx.entity.create({
      data: {
        type: dto.type,
        kind: dto.kind,
        title,
        slug: '_draft-' + randomUUID(),
        summary,
        status: 'DRAFT',
        translations: {
          create: {
            locale: 'es',
            title,
            shortDescription: summary,
          },
        },
      },
      select: { id: true },
    });
  }

  async create(dto: CreateEntityDto) {
    const id = await this.prisma.$transaction(async (tx) => {
      const typeDefinition = await tx.entityTypeDefinition.findUnique({ where: { key: dto.type } });
      if (!typeDefinition || typeDefinition.status !== EntityTypeStatus.ACTIVE) {
        throw new BadRequestException('Entity type is unavailable');
      }
      const existing = await tx.entity.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Slug already exists');

      const entity = await tx.entity.create({
        data: {
          type: dto.type,
          kind: typeDefinition.baseKind,
          title: dto.title.trim(),
          slug: dto.slug.trim(),
          summary: dto.summary?.trim(),
          content: dto.content?.trim(),
          contentLevel: dto.contentLevel,
          status: dto.status ?? 'DRAFT',
          startYear: dto.startYear,
          endYear: dto.endYear,
          translations: {
            create: {
              locale: 'es',
              title: dto.title.trim(),
              shortDescription: dto.summary?.trim() || null,
              essay: dto.content?.trim() || null,
              excerpt: dto.summary?.trim() || null,
            },
          },
        },
      });

      await this.syncContentRelations(tx, entity.id, entity.content);
      return entity.id;
    });

    return this.entities.adminGetById(id);
  }

  async update(id: string, dto: UpdateEntityDto) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.entity.findUnique({
        where: { id },
        select: { id: true, type: true, kind: true, status: true },
      });
      if (!existing) throw new NotFoundException('Entity not found');

      const typeDefinition = dto.type
        ? await tx.entityTypeDefinition.findUnique({ where: { key: dto.type } })
        : null;
      if (
        dto.type &&
        (!typeDefinition ||
          (typeDefinition.status === EntityTypeStatus.INACTIVE && dto.type !== existing.type))
      ) {
        throw new BadRequestException('Entity type is unavailable');
      }

      if (dto.slug) {
        const slugOwner = await tx.entity.findUnique({
          where: { slug: dto.slug },
          select: { id: true },
        });
        if (slugOwner && slugOwner.id !== id) {
          throw new ConflictException('Slug already exists');
        }
      }

      await this.assertRequiredTypeFields(
        tx,
        id,
        dto.type ?? existing.type,
        dto.status ?? existing.status,
      );

      const entity = await tx.entity.update({
        where: { id },
        data: {
          type: dto.type,
          kind: typeDefinition?.baseKind ?? dto.kind ?? existing.kind,
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

      if (dto.title !== undefined || dto.summary !== undefined || dto.content !== undefined) {
        await tx.entityTranslation.upsert({
          where: { entityId_locale: { entityId: id, locale: 'es' } },
          create: {
            entityId: id,
            locale: 'es',
            title: entity.title,
            shortDescription: entity.summary || null,
            essay: entity.content || null,
            excerpt: entity.summary || null,
          },
          update: {
            title: entity.title,
            shortDescription: entity.summary || null,
            essay: entity.content || null,
            excerpt: entity.summary || null,
          },
        });
      }

      await this.syncContentRelations(tx, id, entity.content);
    });

    return this.entities.adminGetById(id);
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.entity.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Entity not found');

      await tx.relation.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] } });
      await tx.entityMedia.deleteMany({ where: { entityId: id } });
      await tx.sourceRef.deleteMany({ where: { entityId: id } });
      await tx.contributor.deleteMany({ where: { entityId: id } });
      await tx.curatorNote.deleteMany({ where: { entityId: id } });
      await tx.entityTag.deleteMany({ where: { entityId: id } });
      await tx.entityAlias.deleteMany({ where: { entityId: id } });
      await tx.homeDeckItem.deleteMany({ where: { entityId: id } });
      await tx.collectionEntity.deleteMany({ where: { entityId: id } });
      await tx.savedEntity.deleteMany({ where: { entityId: id } });
      await tx.artworkDetails.deleteMany({ where: { entityId: id } });
      await tx.artistDetails.deleteMany({ where: { entityId: id } });
      await tx.conceptDetails.deleteMany({ where: { entityId: id } });
      await tx.periodDetails.deleteMany({ where: { entityId: id } });
      await tx.entity.delete({ where: { id } });
    });

    return { ok: true };
  }

  private async assertRequiredTypeFields(
    tx: Prisma.TransactionClient,
    entityId: string,
    type: string,
    status: string,
  ) {
    if (status !== 'PUBLISHED') return;
    const required = await tx.entityTypeFieldDefinition.findMany({
      where: { entityTypeKey: type, isRequired: true },
      select: { attributeDefinitionId: true },
    });
    if (!required.length) return;
    const present = await tx.entityAttribute.findMany({
      where: {
        entityId,
        definitionId: { in: required.map((field) => field.attributeDefinitionId) },
        status: { not: 'REJECTED' },
      },
      select: { definitionId: true },
    });
    if (new Set(present.map((attribute) => attribute.definitionId)).size !== required.length) {
      throw new BadRequestException('Required contextual fields are incomplete');
    }
  }

  async upsertTranslation(id: string, rawLocale: string, dto: UpsertEntityTranslationDto) {
    const locale = normalizeLocale(rawLocale);
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Translation title is required');

    await this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.findUnique({
        where: { id },
        select: { id: true, type: true, kind: true },
      });
      if (!entity) throw new NotFoundException('Entity not found');

      await tx.entityTranslation.upsert({
        where: { entityId_locale: { entityId: id, locale } },
        create: {
          entityId: id,
          locale,
          title,
          shortDescription: dto.shortDescription?.trim() || null,
          essay: dto.essay?.trim() || null,
          notes: dto.notes?.trim() || null,
          excerpt: dto.excerpt?.trim() || null,
        },
        update: {
          title,
          shortDescription: dto.shortDescription?.trim() || null,
          essay: dto.essay?.trim() || null,
          notes: dto.notes?.trim() || null,
          excerpt: dto.excerpt?.trim() || null,
        },
      });

      if (dto.details) {
        await this.upsertTranslatedDetails(tx, id, entity.type, locale, dto.details);
      }

      if (locale === 'es') {
        const updated = await tx.entity.update({
          where: { id },
          data: {
            title,
            summary: dto.shortDescription?.trim() || dto.excerpt?.trim() || null,
            content: dto.essay?.trim() || null,
          },
        });
        if (dto.details) await this.upsertBaseDetails(tx, id, entity.type, dto.details);
        await this.syncContentRelations(tx, id, updated.content);
      }
    });

    return this.entities.adminGetById(id);
  }

  async updateDetails(id: string, dto: UpdateEntityDetailsDto) {
    await this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.findUnique({
        where: { id },
        select: { id: true, type: true, kind: true },
      });
      if (!entity) throw new NotFoundException('Entity not found');
      await this.upsertBaseDetails(tx, id, entity.type, dto);
    });

    return this.entities.adminGetById(id);
  }

  private async upsertBaseDetails(
    tx: Prisma.TransactionClient,
    id: string,
    type: string,
    dto: UpdateEntityDetailsDto,
  ) {
    // ponytail: legacy API bridge; remove after external detail clients have moved to EntityAttribute.
    if (type === 'ARTWORK') {
      const data = {
        authorNation: dto.authorNation?.trim() || null,
        technique: dto.technique?.trim() || null,
        materials: dto.materials?.trim() || null,
        dimensions: dto.dimensions?.trim() || null,
        location: dto.location?.trim() || null,
        collection: dto.collection?.trim() || null,
        state: dto.state?.trim() || null,
      };
      await tx.artworkDetails.upsert({
        where: { entityId: id },
        update: data,
        create: { entityId: id, ...data },
      });
    } else if (type === 'ARTIST') {
      const data = {
        country: dto.country?.trim() || null,
        city: dto.city?.trim() || null,
        birthYear: dto.birthYear ?? null,
        deathYear: dto.deathYear ?? null,
        disciplines: dto.disciplines?.trim() || null,
        bioShort: dto.bioShort?.trim() || null,
        links: dto.links?.trim() || null,
      };
      await tx.artistDetails.upsert({
        where: { entityId: id },
        update: data,
        create: { entityId: id, ...data },
      });
    } else if (type === 'CONCEPT') {
      const data = { definition: dto.definition?.trim() || null };
      await tx.conceptDetails.upsert({
        where: { entityId: id },
        update: data,
        create: { entityId: id, ...data },
      });
    } else if (type === 'PERIOD') {
      const data = { definition: dto.definition?.trim() || null };
      await tx.periodDetails.upsert({
        where: { entityId: id },
        update: data,
        create: { entityId: id, ...data },
      });
    }
  }

  private async upsertTranslatedDetails(
    tx: Prisma.TransactionClient,
    id: string,
    type: string,
    locale: string,
    dto: UpdateEntityDetailsDto,
  ) {
    // ponytail: legacy API bridge; localized attributes are the next i18n migration.
    if (type === 'ARTWORK') {
      const data = {
        authorNation: dto.authorNation?.trim() || null,
        technique: dto.technique?.trim() || null,
        materials: dto.materials?.trim() || null,
        dimensions: dto.dimensions?.trim() || null,
        location: dto.location?.trim() || null,
        collection: dto.collection?.trim() || null,
        state: dto.state?.trim() || null,
      };
      await tx.artworkDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: id, locale } },
        update: data,
        create: { entityId: id, locale, ...data },
      });
    } else if (type === 'ARTIST') {
      const data = {
        country: dto.country?.trim() || null,
        city: dto.city?.trim() || null,
        disciplines: dto.disciplines?.trim() || null,
        bioShort: dto.bioShort?.trim() || null,
        links: dto.links?.trim() || null,
      };
      await tx.artistDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: id, locale } },
        update: data,
        create: { entityId: id, locale, ...data },
      });
    } else if (type === 'CONCEPT') {
      const data = { definition: dto.definition?.trim() || null };
      await tx.conceptDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: id, locale } },
        update: data,
        create: { entityId: id, locale, ...data },
      });
    } else if (type === 'PERIOD') {
      const data = { definition: dto.definition?.trim() || null };
      await tx.periodDetailsTranslation.upsert({
        where: { entityId_locale: { entityId: id, locale } },
        update: data,
        create: { entityId: id, locale, ...data },
      });
    }
  }

  private extractEntityLinks(content: string | null | undefined): string[] {
    if (!content) return [];
    return [
      ...new Set(
        Array.from(content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g))
          .map((match) => (match[1] ?? '').trim())
          .filter(Boolean),
      ),
    ];
  }

  private async syncContentRelations(
    tx: Prisma.TransactionClient,
    entityId: string,
    content: string | null,
  ) {
    const slugs = this.extractEntityLinks(content);
    const targets = slugs.length
      ? await tx.entity.findMany({
          where: { slug: { in: slugs }, id: { not: entityId } },
          select: { id: true },
        })
      : [];
    const targetIds = new Set(targets.map((target) => target.id));
    const existing = await tx.relation.findMany({
      where: { fromId: entityId, ...canonicalRelationTypeFilter(['MENTIONS']) },
      select: { id: true, toId: true },
    });
    const existingTargetIds = new Set(existing.map((relation) => relation.toId));
    const relationType = await tx.relationType.findUniqueOrThrow({
      where: { key: 'MENTIONS' },
      select: { id: true },
    });

    for (const target of targets) {
      if (!existingTargetIds.has(target.id)) {
        await tx.relation.create({
          data: {
            fromId: entityId,
            toId: target.id,
            relationTypeId: relationType.id,
            status: 'PUBLISHED',
          },
        });
      }
    }
    for (const relation of existing) {
      if (!targetIds.has(relation.toId)) {
        await tx.relation.delete({ where: { id: relation.id } });
      }
    }
  }
}
