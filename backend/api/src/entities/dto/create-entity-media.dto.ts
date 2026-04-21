import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MediaDisplayMode, MediaRole } from '@prisma/client';

type CropPresetDto = {
  x?: number | null;
  y?: number | null;
  zoom?: number | null;
};

type SlotCropsDto = {
  explorer3d?: CropPresetDto | null;
  list?: CropPresetDto | null;
  detail?: CropPresetDto | null;
  preview?: CropPresetDto | null;
};

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
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(MediaDisplayMode)
  displayMode?: MediaDisplayMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  focalX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  focalY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assetFocalX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assetFocalY?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsObject()
  slotCrops?: SlotCropsDto;
}
