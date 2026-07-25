import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTaxonomyDto {
  @IsString()
  @MaxLength(80)
  key!: string;

  @IsString()
  @MaxLength(180)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTaxonomyTermDto {
  @IsString()
  @MaxLength(80)
  key!: string;

  @IsString()
  @MaxLength(180)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
