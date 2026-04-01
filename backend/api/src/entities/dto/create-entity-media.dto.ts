import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { MediaDisplayMode, MediaRole } from '@prisma/client';

export class CreateEntityMediaDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsUrl()
  displayUrl?: string;

  @IsOptional()
  @IsUrl()
  sourcePageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  photoBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  license?: string;

  @IsOptional()
  @IsEnum(MediaRole)
  role?: MediaRole;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(MediaDisplayMode)
  displayMode?: MediaDisplayMode;

  @IsOptional()
  @IsNumber()
  focalX?: number;

  @IsOptional()
  @IsNumber()
  focalY?: number;
}
