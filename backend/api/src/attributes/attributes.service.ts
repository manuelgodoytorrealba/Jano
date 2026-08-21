import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttributeValueType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttributeDefinitionDto, CreateEntityAttributeDto } from './dto/attribute.dto';
import { UpdateEntityAttributeDto } from './dto/update-entity-attribute.dto';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  listDefinitions(entityTypeKey?: string) {
    return this.prisma.attributeDefinition.findMany({
      where: {
        isActive: true,
        ...(entityTypeKey ? { typeFields: { some: { entityTypeKey } } } : {}),
      },
      orderBy: { label: 'asc' },
    });
  }

  async createDefinition(dto: CreateAttributeDefinitionDto) {
    const key = dto.key.trim();
    const label = dto.label.trim();
    if (!key || !label)
      throw new BadRequestException('Attribute definition key and label are required');
    try {
      return await this.prisma.attributeDefinition.create({
        data: {
          key,
          label,
          description: dto.description?.trim() || null,
          valueType: dto.valueType,
          isMultiple: dto.isMultiple ?? false,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Attribute definition key already exists');
      throw error;
    }
  }

  async listEntityAttributes(entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Entity not found');
    return this.prisma.entityAttribute.findMany({
      where: { entityId },
      include: { definition: true, citations: { include: { source: true } } },
      orderBy: [{ definition: { label: 'asc' } }, { id: 'asc' }],
    });
  }

  async createEntityAttribute(entityId: string, dto: CreateEntityAttributeDto) {
    const [entity, definition] = await Promise.all([
      this.prisma.entity.findUnique({ where: { id: entityId }, select: { id: true } }),
      this.prisma.attributeDefinition.findUnique({ where: { id: dto.definitionId } }),
    ]);
    if (!entity) throw new NotFoundException('Entity not found');
    if (!definition) throw new NotFoundException('Attribute definition not found');
    const value = this.valueFor(definition.valueType, dto);
    this.assertYears(dto.validFromYear, dto.validToYear);
    if (dto.status === 'PUBLISHED' && !definition.isMultiple) {
      const published = await this.prisma.entityAttribute.findFirst({
        where: { entityId, definitionId: definition.id, status: 'PUBLISHED' },
        select: { id: true },
      });
      if (published)
        throw new ConflictException('A published value already exists for this attribute');
    }
    return this.prisma.entityAttribute.create({
      data: {
        entityId,
        definitionId: definition.id,
        ...value,
        status: dto.status ?? 'DRAFT',
        confidence: dto.confidence,
        validFromYear: dto.validFromYear,
        validToYear: dto.validToYear,
      },
      include: { definition: true, citations: { include: { source: true } } },
    });
  }

  async updateEntityAttribute(id: string, dto: UpdateEntityAttributeDto) {
    const existing = await this.prisma.entityAttribute.findUnique({
      where: { id },
      include: { definition: true },
    });
    if (!existing) throw new NotFoundException('Entity attribute not found');

    const status = dto.status ?? existing.status;
    this.assertYears(
      dto.validFromYear !== undefined ? dto.validFromYear : existing.validFromYear,
      dto.validToYear !== undefined ? dto.validToYear : existing.validToYear,
    );
    const hasValue = [
      dto.valueText,
      dto.valueNumber,
      dto.valueBoolean,
      dto.valueDate,
      dto.valueYear,
      dto.valueJson,
    ].some((value) => value !== undefined);
    const value = hasValue
      ? this.valueFor(existing.definition.valueType, dto as CreateEntityAttributeDto)
      : {};

    if (status === 'PUBLISHED' && !existing.definition.isMultiple) {
      const published = await this.prisma.entityAttribute.findFirst({
        where: {
          entityId: existing.entityId,
          definitionId: existing.definitionId,
          status: 'PUBLISHED',
          id: { not: id },
        },
        select: { id: true },
      });
      if (published)
        throw new ConflictException('A published value already exists for this attribute');
    }

    return this.prisma.entityAttribute.update({
      where: { id },
      data: {
        ...value,
        status: dto.status,
        confidence: dto.confidence !== undefined ? dto.confidence : undefined,
        validFromYear: dto.validFromYear !== undefined ? dto.validFromYear : undefined,
        validToYear: dto.validToYear !== undefined ? dto.validToYear : undefined,
      },
      include: { definition: true, citations: { include: { source: true } } },
    });
  }

  async deleteEntityAttribute(id: string) {
    const existing = await this.prisma.entityAttribute.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Entity attribute not found');
    await this.prisma.entityAttribute.delete({ where: { id } });
    return { ok: true };
  }

  private valueFor(type: AttributeValueType, dto: CreateEntityAttributeDto) {
    const values = {
      valueText: dto.valueText?.trim() || null,
      valueNumber: dto.valueNumber ?? null,
      valueBoolean: dto.valueBoolean ?? null,
      valueDate: dto.valueDate ? new Date(dto.valueDate) : null,
      valueYear: dto.valueYear ?? null,
      valueJson: dto.valueJson ?? null,
    };
    const expected: Record<AttributeValueType, keyof typeof values> = {
      TEXT: 'valueText',
      NUMBER: 'valueNumber',
      BOOLEAN: 'valueBoolean',
      DATE: 'valueDate',
      YEAR: 'valueYear',
      JSON: 'valueJson',
    };
    const present = Object.entries(values).filter(([, value]) => value !== null);
    if (present.length !== 1 || present[0][0] !== expected[type])
      throw new BadRequestException('Attribute value does not match its definition');
    return {
      ...values,
      valueJson: dto.valueJson === undefined ? undefined : (dto.valueJson as Prisma.InputJsonValue),
    };
  }

  private assertYears(from?: number | null, to?: number | null) {
    if (from !== null && from !== undefined && to !== null && to !== undefined && from > to)
      throw new BadRequestException('validFromYear must not be after validToYear');
  }
}
