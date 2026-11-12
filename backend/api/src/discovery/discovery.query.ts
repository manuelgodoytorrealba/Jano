import type { KnowledgeEntityKind } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class DiscoveryQuery {
  @IsOptional() @IsIn(['catalog', 'search']) surface?: 'catalog' | 'search';
  @IsOptional() @IsString() @MaxLength(80) type?: string;
  @IsOptional() @IsString() @MaxLength(8000) layers?: string;
  @IsOptional() @IsString() @MaxLength(300) q?: string;
  @IsOptional() @IsString() @MaxLength(160) deck?: string;
  @IsOptional()
  @IsIn(['PERSON', 'WORK', 'ABSTRACTION', 'EVENT', 'PLACE', 'ORGANIZATION'])
  kind?: KnowledgeEntityKind;
  @IsOptional() @IsIn(['es', 'en']) locale?: string;
}
