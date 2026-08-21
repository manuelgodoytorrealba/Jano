import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentLevel, EntityStatus, KnowledgeEntityKind } from '@prisma/client';

export class CreateEntityDto {
  @IsString()
  @MaxLength(80)
  type!: string;
  @IsOptional()
  @IsEnum(KnowledgeEntityKind)
  kind?: KnowledgeEntityKind;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(180)
  slug!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(ContentLevel)
  contentLevel?: ContentLevel;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsInt()
  startYear?: number;

  @IsOptional()
  @IsInt()
  endYear?: number;
}
