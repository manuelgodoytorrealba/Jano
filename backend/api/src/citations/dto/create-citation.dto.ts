import { CitationStance } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCitationDto {
  @IsString() sourceId!: string;
  @IsOptional() @IsString() researchEvidenceId?: string;
  @IsOptional() @IsEnum(CitationStance) stance?: CitationStance;
  @IsOptional() @IsString() locator?: string;
  @IsOptional() @IsString() quote?: string;
  @IsOptional() @IsString() note?: string;
}
