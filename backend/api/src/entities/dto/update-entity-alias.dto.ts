import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import type { EntityAliasKindValue } from './create-entity-alias.dto';

const ENTITY_ALIAS_KINDS = [
  'ALTERNATE_TITLE',
  'COMMON_NAME',
  'MISSPELLING',
  'TRANSLITERATION',
  'NICKNAME',
  'SEARCH_HINT',
] as const;

export class UpdateEntityAliasDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  value?: string;

  @IsOptional()
  @IsIn(ENTITY_ALIAS_KINDS)
  kind?: EntityAliasKindValue;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;
}
