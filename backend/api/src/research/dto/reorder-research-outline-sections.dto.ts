import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class ReorderResearchOutlineSectionsDto {
  @IsOptional()
  @IsString()
  parentSectionId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sectionIds!: string[];
}
