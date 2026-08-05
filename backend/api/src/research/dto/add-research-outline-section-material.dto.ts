import { IsString, MinLength } from 'class-validator';

export class AddResearchOutlineSectionMaterialDto {
  @IsString()
  @MinLength(1)
  materialVersionId!: string;
}
