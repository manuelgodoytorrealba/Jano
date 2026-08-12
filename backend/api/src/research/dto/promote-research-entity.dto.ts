import { EntityType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class PromoteResearchEntityDto {
  @IsEnum(EntityType) canonicalType!: EntityType;
}
