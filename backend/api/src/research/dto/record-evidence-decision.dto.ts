import { ResearchEvidenceDecisionAction } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordEvidenceDecisionDto {
  @IsString() @IsNotEmpty() evidenceId!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) logicalReviewId!: string;
  @IsEnum(ResearchEvidenceDecisionAction) decision!: ResearchEvidenceDecisionAction;
  @IsOptional() @IsString() @MaxLength(10000) reason?: string;
  @IsObject() payload!: {
    targetEntityId?: string;
    proposition?: string;
    exactSupport?: string;
    canonicalAssertionId?: string;
    duplicateOfLogicalReviewId?: string;
    [key: string]: unknown;
  };
}
