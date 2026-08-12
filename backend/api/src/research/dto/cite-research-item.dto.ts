import { IsIn, IsOptional, IsString } from 'class-validator';

export class CiteResearchItemDto {
  @IsIn(['material', 'excerpt', 'evidence'])
  kind!: 'material' | 'excerpt' | 'evidence';

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  sourceId?: string;
}
