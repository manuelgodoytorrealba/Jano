import { EntityType, KnowledgeEntityKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class PromoteResearchFindingDto {
  @IsEnum(EntityType)
  type!: EntityType;

  @IsEnum(KnowledgeEntityKind)
  kind!: KnowledgeEntityKind;

  @IsString()
  @MaxLength(180)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  summary?: string;
}
