import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityStatus, KnowledgeAssertionStatus } from '@prisma/client';
import { attachResolvedMedia } from '../media/media.resolver';
import { buildAdminMediaLibrary } from '../media/media-diagnostics';
import { translationStatusSummary } from './entity-translation.resolver';
import { EntityMediaService } from '../media/entity-media.service';
import {
  localizedInclude,
  resolveLocalizedEntity,
  resolveLocalizedEntityWithDetails,
  serializeRelation,
  serializeSourceRef,
  type EntityTypedDetailsRecord,
  type TranslationRecord,
} from './entity.presenter';

type LocalizedEntityRecord = Parameters<typeof resolveLocalizedEntity>[0];

type RelationTypeTranslationRecord = TranslationRecord & {
  label?: string | null;
  inverseLabel?: string | null;
};

type RelationLabelRecord = {
  relationType: {
    label?: string | null;
    inverseLabel?: string | null;
    key: string;
    directed?: boolean | null;
    translations?: RelationTypeTranslationRecord[] | null;
  };
};

type JustificationTranslationRecord = TranslationRecord & {
  justification?: string | null;
};

type SerializedRelationRecord = RelationLabelRecord & {
  justification?: string | null;
  translations?: JustificationTranslationRecord[] | null;
};

type SourceTranslationRecord = TranslationRecord & {
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
};

type SerializedSourceRecord = {
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  translations?: SourceTranslationRecord[] | null;
};

type SourceRefTranslationRecord = TranslationRecord & {
  quote?: string | null;
  note?: string | null;
};

type SerializedSourceRefRecord = {
  quote?: string | null;
  note?: string | null;
  source?: SerializedSourceRecord | null;
  translations?: SourceRefTranslationRecord[] | null;
};

type PublicEntityAttributeRecord = {
  id: string;
  locale?: string | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: Date | string | null;
  valueYear?: number | null;
  valueJson?: unknown;
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
  definition: { id: string; key: string; label: string; valueType: string; isMultiple: boolean };
  citations?: Array<{
    id: string;
    stance: string;
    locator?: string | null;
    quote?: string | null;
    source: {
      id: string;
      type: string;
      title: string;
      author?: string | null;
      publisher?: string | null;
      year?: number | null;
      url?: string | null;
    };
  }> | null;
};

type EntityRecord = LocalizedEntityRecord & {
  id: string;
  type: string;
  slug: string;
  startYear?: number | null;
  endYear?: number | null;
  typeDefinition?: {
    key: string;
    singularName: string;
    icon: string;
    colorToken: string;
    baseKind: string;
  } | null;
};

type AdminEntityDetailRecord = EntityRecord &
  EntityTypedDetailsRecord & {
    attributes?: PublicEntityAttributeRecord[] | null;
    outgoing?: Array<
      SerializedRelationRecord & { to?: (LocalizedEntityRecord & EntityTypedDetailsRecord) | null }
    > | null;
    incoming?: Array<
      SerializedRelationRecord & {
        from?: (LocalizedEntityRecord & EntityTypedDetailsRecord) | null;
      }
    > | null;
  };

@Injectable()
export class EntityReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityMedia: EntityMediaService,
  ) {}

  async getBySlug(slug: string, locale?: string) {
    const entity = await this.prisma.entity.findFirst({
      where: {
        slug,
        status: EntityStatus.PUBLISHED,
      },
      include: {
        typeDefinition: {
          select: { key: true, singularName: true, icon: true, colorToken: true, baseKind: true },
        },
        translations: localizedInclude(locale),
        artwork: { include: { translations: localizedInclude(locale) } },
        artist: { include: { translations: localizedInclude(locale) } },
        concept: { include: { translations: localizedInclude(locale) } },
        period: { include: { translations: localizedInclude(locale) } },
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },

        classifications: {
          include: { term: { include: { taxonomy: true } } },
          orderBy: [{ term: { taxonomy: { key: 'asc' } } }, { term: { key: 'asc' } }],
        },
        attributes: {
          where: { status: KnowledgeAssertionStatus.PUBLISHED },
          include: {
            definition: true,
            citations: {
              select: {
                id: true,
                stance: true,
                locator: true,
                quote: true,
                source: {
                  select: {
                    id: true,
                    type: true,
                    title: true,
                    author: true,
                    publisher: true,
                    year: true,
                    url: true,
                  },
                },
              },
            },
          },
          orderBy: [{ definition: { label: 'asc' } }, { id: 'asc' }],
        },
        mediaLinks: {
          include: { media: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        contributors: true,
        sourceRefs: {
          include: {
            source: { include: { translations: localizedInclude(locale) } },
            translations: localizedInclude(locale),
          },
        },
        outgoing: {
          where: {
            status: EntityStatus.PUBLISHED,
            to: {
              status: EntityStatus.PUBLISHED,
            },
          },
          include: {
            relationType: { include: { translations: localizedInclude(locale) } },
            translations: localizedInclude(locale),
            to: {
              include: {
                translations: localizedInclude(locale),
                mediaLinks: {
                  include: { media: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
              },
            },
          },
        },
        incoming: {
          where: {
            status: EntityStatus.PUBLISHED,
            from: {
              status: EntityStatus.PUBLISHED,
            },
          },
          include: {
            relationType: { include: { translations: localizedInclude(locale) } },
            translations: localizedInclude(locale),
            from: {
              include: {
                translations: localizedInclude(locale),
                mediaLinks: {
                  include: { media: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
              },
            },
          },
        },
      },
    });

    if (!entity) throw new NotFoundException('Entity not found');

    const detailedEntity = entity as AdminEntityDetailRecord;

    return {
      ...resolveLocalizedEntityWithDetails(detailedEntity, locale),

      attributes: detailedEntity.attributes ?? [],
      outgoing: (detailedEntity.outgoing ?? []).map((relation) => ({
        ...serializeRelation(relation, locale),
        to: relation.to ? resolveLocalizedEntityWithDetails(relation.to, locale) : relation.to,
      })),
      incoming: (detailedEntity.incoming ?? []).map((relation) => ({
        ...serializeRelation(relation, locale),
        from: relation.from
          ? resolveLocalizedEntityWithDetails(relation.from, locale)
          : relation.from,
      })),
    };
  }

  async previewBySlug(slug: string, locale?: string) {
    const e = await this.findPreviewEntityBySlug(slug, locale, true);

    return {
      ...resolveLocalizedEntity(e, locale),
      mediaLibrary: buildAdminMediaLibrary(e),
    };
  }

  async adminPreviewBySlug(slug: string, locale?: string) {
    const e = await this.findPreviewEntityBySlug(slug, locale, false);

    return {
      ...resolveLocalizedEntity(e, locale),
      mediaLibrary: buildAdminMediaLibrary(e),
    };
  }

  private async findPreviewEntityBySlug(
    slug: string,
    locale: string | undefined,
    publishedOnly: boolean,
  ) {
    const e = await this.prisma.entity.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { status: EntityStatus.PUBLISHED } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        kind: true,
        summary: true,
        status: true,
        contentLevel: true,
        startYear: true,
        endYear: true,
        typeDefinition: {
          select: { key: true, singularName: true, icon: true, colorToken: true, baseKind: true },
        },
        translations: localizedInclude(locale),
        tags: {
          select: {
            weight: true,
            source: true,
            tag: true,
          },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        mediaLinks: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            role: true,
            sortOrder: true,
            isPrimary: true,
            displayMode: true,
            focalX: true,
            focalY: true,
            cropExplorer3d: true,
            cropList: true,
            cropDetail: true,
            cropPreview: true,
            media: {
              select: {
                id: true,
                url: true,
                originType: true,
                derivedFromMediaId: true,
                canonicalUrl: true,
                displayUrl: true,
                sourcePageUrl: true,
                storageKey: true,
                originalFilename: true,
                fileSize: true,
                mimeType: true,
                width: true,
                height: true,
                focalX: true,
                focalY: true,
                isVector: true,
                provider: true,
                qualityTier: true,
                alt: true,
                source: true,
                photoBy: true,
                license: true,
              },
            },
          },
        },
      },
    });

    if (!e) throw new NotFoundException('Entity not found');

    return e;
  }

  async adminGetById(id: string) {
    await this.entityMedia.normalizeLegacyPrimary(id);

    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        typeDefinition: {
          select: { key: true, singularName: true, icon: true, colorToken: true, baseKind: true },
        },
        translations: { orderBy: { locale: 'asc' } },
        aliases: {
          orderBy: [{ locale: 'asc' }, { kind: 'asc' }, { value: 'asc' }],
        },
        artwork: { include: { translations: { orderBy: { locale: 'asc' } } } },
        artist: { include: { translations: { orderBy: { locale: 'asc' } } } },
        concept: { include: { translations: { orderBy: { locale: 'asc' } } } },
        period: { include: { translations: { orderBy: { locale: 'asc' } } } },
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { label: 'asc' } }],
        },
        classifications: {
          include: { term: { include: { taxonomy: true } } },
          orderBy: [{ term: { taxonomy: { key: 'asc' } } }, { term: { key: 'asc' } }],
        },
        mediaLinks: {
          include: {
            media: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        contributors: {
          orderBy: [{ role: 'asc' }, { id: 'asc' }],
        },
        sourceRefs: {
          include: {
            source: { include: { translations: { orderBy: { locale: 'asc' } } } },
            translations: { orderBy: { locale: 'asc' } },
          },
          orderBy: [{ id: 'asc' }],
        },
        outgoing: {
          include: {
            relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
            translations: { orderBy: { locale: 'asc' } },
            to: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                kind: true,
                summary: true,
              },
            },
          },
          orderBy: [{ relationType: { key: 'asc' } }, { id: 'asc' }],
        },
        incoming: {
          include: {
            relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
            translations: { orderBy: { locale: 'asc' } },
            from: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                kind: true,
                summary: true,
              },
            },
          },
          orderBy: [{ relationType: { key: 'asc' } }, { id: 'asc' }],
        },
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const resolvedEntity = attachResolvedMedia(entity);

    return {
      ...entity,
      outgoing: (entity.outgoing ?? []).map((relation) => serializeRelation(relation)),
      incoming: (entity.incoming ?? []).map((relation) => serializeRelation(relation)),
      resolvedMedia: resolvedEntity.resolvedMedia,
      mediaLibrary: buildAdminMediaLibrary(entity),
      translationStatus: translationStatusSummary(entity.translations),
    };
  }

  async adminListRelations(entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const rows = await this.prisma.relation.findMany({
      where: { fromId: entityId },
      orderBy: [{ relationType: { key: 'asc' } }, { id: 'asc' }],
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        to: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            kind: true,
          },
        },
      },
    });

    return rows.map((relation) => serializeRelation(relation, 'es'));
  }

  async adminListIncomingRelations(entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const rows = await this.prisma.relation.findMany({
      where: { toId: entityId },
      orderBy: [{ relationType: { key: 'asc' } }, { id: 'asc' }],
      include: {
        relationType: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
        from: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            kind: true,
          },
        },
      },
    });

    return rows.map((relation) => serializeRelation(relation, 'es'));
  }
}
