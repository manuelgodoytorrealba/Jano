import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityTypeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEntityTypeDefinitionDto,
  EntityTypeFieldDto,
  UpdateEntityTypeDefinitionDto,
} from './dto/entity-type-definition.dto';

@Injectable()
export class EntityTypeDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = true) {
    return this.prisma.entityTypeDefinition.findMany({
      where: includeInactive ? undefined : { status: EntityTypeStatus.ACTIVE },
      include: {
        _count: { select: { entities: true } },
        fields: { include: { attributeDefinition: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ systemType: 'desc' }, { singularName: 'asc' }],
    });
  }

  async create(dto: CreateEntityTypeDefinitionDto) {
    const key = dto.key.trim().toUpperCase();
    if (!key) throw new BadRequestException('Type key is required');
    const existing = await this.prisma.entityTypeDefinition.findUnique({ where: { key } });
    if (existing) throw new ConflictException('Type key already exists');
    return this.prisma.entityTypeDefinition.create({
      data: { ...dto, key, status: dto.status ?? 'DRAFT' },
    });
  }

  async update(key: string, dto: UpdateEntityTypeDefinitionDto) {
    const current = await this.prisma.entityTypeDefinition.findUnique({ where: { key } });
    if (!current) throw new NotFoundException('Entity type not found');
    if (
      current.systemType &&
      ((dto.key && dto.key !== key) || (dto.baseKind && dto.baseKind !== current.baseKind))
    ) {
      throw new BadRequestException('System type key and base kind are protected');
    }
    return this.prisma.entityTypeDefinition.update({
      where: { key },
      data: { ...dto, key: dto.key?.trim().toUpperCase() },
    });
  }

  async remove(key: string) {
    const type = await this.prisma.entityTypeDefinition.findUnique({
      where: { key },
      include: { _count: { select: { entities: true } } },
    });
    if (!type) throw new NotFoundException('Entity type not found');
    if (type.systemType) throw new BadRequestException('System types cannot be deleted');
    if (type._count.entities)
      throw new BadRequestException('Entity type is in use; deactivate it instead');
    await this.prisma.entityTypeDefinition.delete({ where: { key } });
    return { ok: true };
  }

  async replaceFields(key: string, fields: EntityTypeFieldDto[]) {
    const type = await this.prisma.entityTypeDefinition.findUnique({
      where: { key },
      select: { key: true },
    });
    if (!type) throw new NotFoundException('Entity type not found');
    const definitionIds = fields.map((field) => field.attributeDefinitionId);
    if (new Set(definitionIds).size !== definitionIds.length)
      throw new BadRequestException('A field can only be configured once');
    const definitions = await this.prisma.attributeDefinition.count({
      where: { id: { in: definitionIds }, isActive: true },
    });
    if (definitions !== definitionIds.length)
      throw new BadRequestException('Attribute definition is unavailable');
    await this.prisma.$transaction([
      this.prisma.entityTypeFieldDefinition.deleteMany({ where: { entityTypeKey: key } }),
      this.prisma.entityTypeFieldDefinition.createMany({
        data: fields.map((field, index) => ({
          entityTypeKey: key,
          attributeDefinitionId: field.attributeDefinitionId,
          sortOrder: field.sortOrder ?? index,
          isRequired: field.isRequired ?? false,
        })),
      }),
    ]);
    return this.prisma.entityTypeDefinition.findUniqueOrThrow({
      where: { key },
      include: {
        _count: { select: { entities: true } },
        fields: { include: { attributeDefinition: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }
}
