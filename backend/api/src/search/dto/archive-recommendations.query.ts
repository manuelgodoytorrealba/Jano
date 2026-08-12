import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const TYPES = ['ARTWORK', 'ARTIST', 'ARTICLE', 'PERIOD', 'MOVEMENT', 'CONCEPT', 'PLACE'] as const;

export class ArchiveRecommendationsQuery {
  @IsOptional()
  @IsIn(TYPES)
  type?: (typeof TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number = 24;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? '').trim())
  locale?: string;
}
