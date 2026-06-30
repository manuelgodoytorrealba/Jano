import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { CreateSourceRefDto } from './dto/create-source-ref.dto';
import { UpdateContributorDto } from './dto/update-contributor.dto';
import { UpdateSourceRefDto } from './dto/update-source-ref.dto';
import { serializeSourceRef } from './entity.presenter';

@Injectable()
export class EntityCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSourceRef(entityId: string, dto: CreateSourceRefDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    const source = await this.prisma.source.create({
      data: {
        type: dto.sourceType,
        title: dto.sourceTitleEs?.trim() || dto.sourceTitle.trim(),
        author: dto.sourceAuthorEs?.trim() || dto.sourceAuthor?.trim() || null,
        publisher: dto.sourcePublisherEs?.trim() || dto.sourcePublisher?.trim() || null,
        year: dto.sourceYear ?? null,
        url: dto.sourceUrl?.trim() || null,
      },
    });
    await this.upsertSourceTranslations(source.id, dto);

    const ref = await this.prisma.sourceRef.create({
      data: {
        entityId,
        sourceId: source.id,
        page: dto.page?.trim() || null,
        quote: dto.quoteEs?.trim() || dto.quote?.trim() || null,
        note: dto.noteEs?.trim() || dto.note?.trim() || null,
      },
    });
    await this.upsertSourceRefTranslations(ref.id, dto);
    return this.getSourceRef(ref.id);
  }

  async updateSourceRef(entityId: string, refId: string, dto: UpdateSourceRefDto) {
    const existing = await this.prisma.sourceRef.findFirst({
      where: { id: refId, entityId },
      include: { source: true },
    });
    if (!existing) throw new NotFoundException('Source reference not found');

    await this.prisma.source.update({
      where: { id: existing.sourceId },
      data: {
        type: dto.sourceType ?? undefined,
        title:
          dto.sourceTitleEs !== undefined || dto.sourceTitle !== undefined
            ? dto.sourceTitleEs?.trim() || dto.sourceTitle?.trim() || existing.source.title
            : undefined,
        author:
          dto.sourceAuthorEs !== undefined || dto.sourceAuthor !== undefined
            ? dto.sourceAuthorEs?.trim() || dto.sourceAuthor?.trim() || null
            : undefined,
        publisher:
          dto.sourcePublisherEs !== undefined || dto.sourcePublisher !== undefined
            ? dto.sourcePublisherEs?.trim() || dto.sourcePublisher?.trim() || null
            : undefined,
        year: dto.sourceYear !== undefined ? (dto.sourceYear ?? null) : undefined,
        url: dto.sourceUrl !== undefined ? dto.sourceUrl?.trim() || null : undefined,
      },
    });
    await this.upsertSourceTranslations(existing.sourceId, dto);

    await this.prisma.sourceRef.update({
      where: { id: refId },
      data: {
        page: dto.page !== undefined ? dto.page?.trim() || null : undefined,
        quote:
          dto.quoteEs !== undefined || dto.quote !== undefined
            ? dto.quoteEs?.trim() || dto.quote?.trim() || null
            : undefined,
        note:
          dto.noteEs !== undefined || dto.note !== undefined
            ? dto.noteEs?.trim() || dto.note?.trim() || null
            : undefined,
      },
    });
    await this.upsertSourceRefTranslations(refId, dto);
    return this.getSourceRef(refId);
  }

  async deleteSourceRef(entityId: string, refId: string) {
    const existing = await this.prisma.sourceRef.findFirst({
      where: { id: refId, entityId },
      select: { id: true, sourceId: true },
    });
    if (!existing) throw new NotFoundException('Source reference not found');

    await this.prisma.sourceRef.delete({ where: { id: refId } });
    const remaining = await this.prisma.sourceRef.count({
      where: { sourceId: existing.sourceId },
    });
    if (remaining === 0) await this.prisma.source.delete({ where: { id: existing.sourceId } });
    return { ok: true };
  }

  async createContributor(entityId: string, dto: CreateContributorDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    return this.prisma.contributor.create({
      data: {
        entityId,
        name: dto.name.trim(),
        role: dto.role.trim(),
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateContributor(entityId: string, contributorId: string, dto: UpdateContributorDto) {
    const existing = await this.prisma.contributor.findFirst({
      where: { id: contributorId, entityId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Contributor not found');

    return this.prisma.contributor.update({
      where: { id: contributorId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        role: dto.role !== undefined ? dto.role.trim() : undefined,
        note: dto.note !== undefined ? dto.note?.trim() || null : undefined,
      },
    });
  }

  async deleteContributor(entityId: string, contributorId: string) {
    const existing = await this.prisma.contributor.findFirst({
      where: { id: contributorId, entityId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Contributor not found');

    await this.prisma.contributor.delete({ where: { id: contributorId } });
    return { ok: true };
  }

  private async upsertSourceTranslations(
    sourceId: string,
    dto: CreateSourceRefDto | UpdateSourceRefDto,
  ) {
    const titleEs = dto.sourceTitleEs?.trim() || dto.sourceTitle?.trim() || null;
    const titleEn = dto.sourceTitleEn?.trim() || null;
    const authorEs = dto.sourceAuthorEs?.trim() || dto.sourceAuthor?.trim() || null;
    const authorEn = dto.sourceAuthorEn?.trim() || null;
    const publisherEs = dto.sourcePublisherEs?.trim() || dto.sourcePublisher?.trim() || null;
    const publisherEn = dto.sourcePublisherEn?.trim() || null;

    await Promise.all([
      this.prisma.sourceTranslation.upsert({
        where: { sourceId_locale: { sourceId, locale: 'es' } },
        update: { title: titleEs ?? '', author: authorEs, publisher: publisherEs },
        create: {
          sourceId,
          locale: 'es',
          title: titleEs ?? '',
          author: authorEs,
          publisher: publisherEs,
        },
      }),
      this.prisma.sourceTranslation.upsert({
        where: { sourceId_locale: { sourceId, locale: 'en' } },
        update: { title: titleEn ?? titleEs ?? '', author: authorEn, publisher: publisherEn },
        create: {
          sourceId,
          locale: 'en',
          title: titleEn ?? titleEs ?? '',
          author: authorEn,
          publisher: publisherEn,
        },
      }),
    ]);
  }

  private async upsertSourceRefTranslations(
    sourceRefId: string,
    dto: CreateSourceRefDto | UpdateSourceRefDto,
  ) {
    const quoteEs = dto.quoteEs?.trim() || dto.quote?.trim() || null;
    const quoteEn = dto.quoteEn?.trim() || null;
    const noteEs = dto.noteEs?.trim() || dto.note?.trim() || null;
    const noteEn = dto.noteEn?.trim() || null;

    await Promise.all([
      this.prisma.sourceRefTranslation.upsert({
        where: { sourceRefId_locale: { sourceRefId, locale: 'es' } },
        update: { quote: quoteEs, note: noteEs },
        create: { sourceRefId, locale: 'es', quote: quoteEs, note: noteEs },
      }),
      this.prisma.sourceRefTranslation.upsert({
        where: { sourceRefId_locale: { sourceRefId, locale: 'en' } },
        update: { quote: quoteEn, note: noteEn },
        create: { sourceRefId, locale: 'en', quote: quoteEn, note: noteEn },
      }),
    ]);
  }

  private async getSourceRef(id: string) {
    const ref = await this.prisma.sourceRef.findUniqueOrThrow({
      where: { id },
      include: {
        source: { include: { translations: { orderBy: { locale: 'asc' } } } },
        translations: { orderBy: { locale: 'asc' } },
      },
    });
    return serializeSourceRef(ref, 'es');
  }
}
