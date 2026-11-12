import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator';

export type SearchEntityType = string;

const KINDS = ['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'] as const;
export type SearchKnowledgeEntityKind = (typeof KINDS)[number];

export class SearchQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @IsString() @MaxLength(8000) layers?: string;
  @IsOptional() @IsUUID() image?: string;
  @IsOptional() @IsString() @Matches(/^#[a-f0-9]{6}(,#[a-f0-9]{6})?$/i) colors?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsIn(KINDS, { each: true })
  kind?: SearchKnowledgeEntityKind[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsString({ each: true })
  type?: SearchEntityType[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDrafts?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  recordInterest?: boolean;
}
