import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResearchEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
