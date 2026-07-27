import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateResearchOutlineSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  parentSectionId?: string;
}
