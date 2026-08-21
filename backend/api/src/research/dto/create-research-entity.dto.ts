import { KnowledgeEntityKind } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchEntityDto {
  @IsOptional() @IsEnum(KnowledgeEntityKind) kind?: KnowledgeEntityKind;
  @IsOptional() @IsString() canonicalType?: string;
  @IsString() @MaxLength(180) title!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) evidenceIds!: string[];
  @IsOptional() @IsString() @MaxLength(1200) summary?: string;
  @IsOptional() @IsString() canonicalEntityId?: string;
}
