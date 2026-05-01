import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const TYPES = ['ARTWORK', 'ARTIST', 'ARTICLE', 'PERIOD', 'MOVEMENT', 'CONCEPT', 'PLACE', 'TEXT'] as const;
export type SearchEntityType = (typeof TYPES)[number];

export class SearchQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value : value ? [value] : undefined)
  @IsIn(TYPES, { each: true })
  type?: SearchEntityType[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDrafts?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;
}
