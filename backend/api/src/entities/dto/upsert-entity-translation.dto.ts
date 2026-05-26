import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertEntityTranslationDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  essay?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;
}
