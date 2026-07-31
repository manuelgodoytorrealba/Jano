import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchPdfMaterialDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;
}
