import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchEvidenceDto {
  @IsString()
  sourceId!: string;

  @IsString()
  @MaxLength(120)
  sourceVersion!: string;

  @IsString()
  @MaxLength(120)
  locator!: string;

  @IsString()
  quote!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
