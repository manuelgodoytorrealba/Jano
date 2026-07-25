import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCitationDto } from './dto/create-citation.dto';
import { UpdateCitationDto } from './dto/update-citation.dto';

type CitationTarget = 'entity' | 'relation' | 'attribute';

@Injectable()
export class CitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(target: CitationTarget, targetId: string) {
    return this.prisma.citation.findMany({
      where:
        target === 'entity'
          ? { entityId: targetId }
          : target === 'relation'
            ? { relationId: targetId }
            : { entityAttributeId: targetId },
      include: { source: true, translations: true },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateCitationDto) {
    const citation = await this.prisma.citation.findUnique({
      where: { id },
      select: { id: true, sourceId: true, researchEvidenceId: true },
    });
    if (!citation) throw new NotFoundException('Citation not found');
    const sourceId = dto.sourceId ?? citation.sourceId;
    if (dto.sourceId) {
      const source = await this.prisma.source.findUnique({
        where: { id: dto.sourceId },
        select: { id: true },
      });
      if (!source) throw new NotFoundException('Source not found');
    }
    const researchEvidenceId =
      dto.researchEvidenceId === undefined
        ? citation.researchEvidenceId
        : dto.researchEvidenceId.trim() || null;
    await this.requireEvidenceSourceMatch(researchEvidenceId, sourceId);

    return this.prisma.citation.update({
      where: { id },
      data: {
        sourceId: dto.sourceId,
        researchEvidenceId: dto.researchEvidenceId === undefined ? undefined : researchEvidenceId,
        stance: dto.stance,
        locator: dto.locator !== undefined ? dto.locator.trim() || null : undefined,
        quote: dto.quote !== undefined ? dto.quote.trim() || null : undefined,
        note: dto.note !== undefined ? dto.note.trim() || null : undefined,
      },
      include: { source: true, translations: true },
    });
  }
  async delete(id: string) {
    const citation = await this.prisma.citation.findUnique({ where: { id }, select: { id: true } });
    if (!citation) throw new NotFoundException('Citation not found');
    await this.prisma.citation.delete({ where: { id } });
    return { ok: true };
  }

  async create(target: CitationTarget, targetId: string, dto: CreateCitationDto) {
    const [source, targetExists] = await Promise.all([
      this.prisma.source.findUnique({ where: { id: dto.sourceId }, select: { id: true } }),
      target === 'entity'
        ? this.prisma.entity.findUnique({ where: { id: targetId }, select: { id: true } })
        : target === 'relation'
          ? this.prisma.relation.findUnique({ where: { id: targetId }, select: { id: true } })
          : this.prisma.entityAttribute.findUnique({
              where: { id: targetId },
              select: { id: true },
            }),
    ]);
    if (!source) throw new NotFoundException('Source not found');
    if (!targetExists) throw new NotFoundException('Citation target not found');
    const researchEvidenceId = dto.researchEvidenceId?.trim() || null;
    await this.requireEvidenceSourceMatch(researchEvidenceId, source.id);

    return this.prisma.citation.create({
      data: {
        sourceId: source.id,
        researchEvidenceId,
        ...(target === 'entity' ? { entityId: targetId } : {}),
        ...(target === 'relation' ? { relationId: targetId } : {}),
        ...(target === 'attribute' ? { entityAttributeId: targetId } : {}),
        stance: dto.stance ?? 'MENTIONS',
        locator: dto.locator?.trim() || null,
        quote: dto.quote?.trim() || null,
        note: dto.note?.trim() || null,
      },
      include: { source: true, translations: true },
    });
  }
  private async requireEvidenceSourceMatch(researchEvidenceId: string | null, sourceId?: string) {
    if (!researchEvidenceId) return;
    const evidence = await this.prisma.researchEvidence.findUnique({
      where: { id: researchEvidenceId },
      select: { sourceId: true },
    });
    if (!evidence) throw new NotFoundException('Research evidence not found');
    if (sourceId !== evidence.sourceId) {
      throw new BadRequestException('Citation source must match research evidence source');
    }
  }
}
