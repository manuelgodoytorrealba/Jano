import { ResearchClaimKind } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateResearchClaimDto {
  @IsEnum(ResearchClaimKind)
  kind!: ResearchClaimKind;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  evidenceIds!: string[];

  @IsOptional()
  @IsString()
  subjectClaimId?: string;

  @IsOptional()
  @IsString()
  objectClaimId?: string;

  @IsOptional()
  @IsBoolean()
  readyForPromotion?: boolean;
}

export class SetResearchClaimReadinessDto {
  @IsBoolean()
  readyForPromotion!: boolean;
}
