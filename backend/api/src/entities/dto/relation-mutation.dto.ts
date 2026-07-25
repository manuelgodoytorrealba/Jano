import { KnowledgeAssertionStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RelationMutationDto {
  @IsOptional()
  @IsString()
  toId?: string;

  @IsOptional()
  @IsString()
  relationTypeId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  justificationEs?: string;

  @IsOptional()
  @IsString()
  justificationEn?: string;

  @IsOptional()
  @IsNumber()
  weight?: number | null;

  @IsOptional()
  @IsEnum(KnowledgeAssertionStatus)
  status?: KnowledgeAssertionStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number | null;

  @IsOptional()
  @IsInt()
  validFromYear?: number | null;

  @IsOptional()
  @IsInt()
  validToYear?: number | null;
}
