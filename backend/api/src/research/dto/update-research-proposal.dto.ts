import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KnowledgeEntityKind, ResearchClaimKind } from '@prisma/client';

export class UpdateResearchProposalDto {
  @IsOptional() @IsString() @MaxLength(240) title?: string;
  @IsOptional() @IsString() @MaxLength(1_200) summary?: string;
  @IsOptional() @IsEnum(KnowledgeEntityKind) entityKind?: KnowledgeEntityKind;
  @IsOptional() @IsEnum(ResearchClaimKind) claimKind?: ResearchClaimKind;
  @IsOptional() @IsString() relationTypeId?: string;
  @IsOptional() @IsString() @MaxLength(1_200) explanation?: string;
}
