import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { UpdateEntityDetailsDto } from './update-entity-details.dto';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEntityDetailsDto)
  details?: UpdateEntityDetailsDto;
}
