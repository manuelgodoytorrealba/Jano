import { AttributeValueType, KnowledgeAssertionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAttributeDefinitionDto {
  @IsString() key!: string;
  @IsString() label!: string;
  @IsEnum(AttributeValueType) valueType!: AttributeValueType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isMultiple?: boolean;
}

export class CreateEntityAttributeDto {
  @IsString() definitionId!: string;
  @IsOptional() @IsString() valueText?: string;
  @IsOptional() @IsNumber() valueNumber?: number;
  @IsOptional() @IsBoolean() valueBoolean?: boolean;
  @IsOptional() @IsString() valueDate?: string;
  @IsOptional() @IsInt() valueYear?: number;
  @IsOptional() valueJson?: unknown;
  @IsOptional() @IsEnum(KnowledgeAssertionStatus) status?: KnowledgeAssertionStatus;
  @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
  @IsOptional() @IsInt() validFromYear?: number;
  @IsOptional() @IsInt() validToYear?: number;
}
