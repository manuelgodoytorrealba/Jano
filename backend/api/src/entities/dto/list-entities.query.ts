import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const TYPES = ['ARTWORK', 'PERIOD', 'MOVEMENT', 'CONCEPT', 'ARTIST'] as const;
export type EntityType = (typeof TYPES)[number];

export class ListEntitiesQuery {
  @IsOptional()
  @IsIn(TYPES)
  type?: EntityType;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit: number = 24;

  @IsOptional()
  @IsIn(['recent', 'title'] as const)
  sort?: 'recent' | 'title';
}