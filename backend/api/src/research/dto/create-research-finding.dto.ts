import { ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchFindingDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  summary?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  evidenceIds!: string[];
}
