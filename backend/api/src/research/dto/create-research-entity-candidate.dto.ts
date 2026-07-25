import { KnowledgeEntityKind } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchEntityCandidateDto {
  @IsEnum(KnowledgeEntityKind) kind!: KnowledgeEntityKind;
  @IsString() @MaxLength(180) title!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) evidenceIds!: string[];
  @IsOptional() @IsString() @MaxLength(1200) summary?: string;
  @IsOptional() @IsString() suggestedEntityId?: string;
}
