import { IsString, MinLength } from 'class-validator';

export class AddResearchOutlineSectionExcerptDto {
  @IsString()
  @MinLength(1)
  libraryExcerptId!: string;
}
