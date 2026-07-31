import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateResearchEvidenceDto {
  @IsString()
  sourceId!: string;

  @IsString()
  @MaxLength(120)
  sourceVersion!: string;

  @IsString()
  @MaxLength(120)
  locator!: string;

  @IsOptional()
  @IsString()
  libraryExcerptId?: string;

  @ValidateIf((dto: CreateResearchEvidenceDto) => !dto.libraryExcerptId)
  @IsString()
  @MinLength(1)
  quote?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
