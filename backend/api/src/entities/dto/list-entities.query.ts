import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const TYPES = [
  'ARTWORK',
  'ARTIST',
  'ARTICLE',
  'PERIOD',
  'MOVEMENT',
  'CONCEPT',
  'PLACE',
  'TEXT',
  'EVENT',
  'ORGANIZATION',
] as const;
export type EntityType = (typeof TYPES)[number];

const KINDS = ['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'] as const;
export type KnowledgeEntityKind = (typeof KINDS)[number];

export class ListEntitiesQuery {
  @IsOptional()
  @IsIn(TYPES)
  type?: EntityType;

  @IsOptional()
  @IsIn(KINDS)
  kind?: KnowledgeEntityKind;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  deck?: string;

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
  @IsIn(['recent', 'updated', 'title', 'relevance'])
  sort?: 'recent' | 'updated' | 'title' | 'relevance';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  contentLevel?: string;

  @IsOptional()
  @IsString()
  movement?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  taxonomy?: string;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
