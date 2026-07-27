import { ResearchOutlineSectionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateResearchOutlineSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsEnum(ResearchOutlineSectionStatus)
  status?: ResearchOutlineSectionStatus;
  @IsOptional()
  @IsString()
  @MaxLength(600)
  objective?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
