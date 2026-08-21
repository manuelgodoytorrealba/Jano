import { EntityTypeStatus, KnowledgeEntityKind } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateEntityTypeDefinitionDto {
  @IsString() @MaxLength(80) key!: string;
  @IsString() @MaxLength(80) singularName!: string;
  @IsString() @MaxLength(80) pluralName!: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;
  @IsOptional() @IsString() @MaxLength(4) icon?: string;
  @IsOptional() @IsString() @MaxLength(32) colorToken?: string;
  @IsEnum(KnowledgeEntityKind) baseKind!: KnowledgeEntityKind;
  @IsOptional() @IsEnum(EntityTypeStatus) status?: EntityTypeStatus;
}

export class UpdateEntityTypeDefinitionDto extends PartialType(CreateEntityTypeDefinitionDto) {
  @IsOptional() @IsBoolean() systemType?: boolean;
}

export class EntityTypeFieldDto {
  @IsString() attributeDefinitionId!: string;
  @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class UpdateEntityTypeFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntityTypeFieldDto)
  fields!: EntityTypeFieldDto[];
}
