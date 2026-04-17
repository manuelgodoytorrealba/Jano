import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreateSourceRefDto {
  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsString()
  @MaxLength(240)
  sourceTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  sourceAuthor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  sourcePublisher?: string;

  @IsOptional()
  @IsInt()
  sourceYear?: number;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  page?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
