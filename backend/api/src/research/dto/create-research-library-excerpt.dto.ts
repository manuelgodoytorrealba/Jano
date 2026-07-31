import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateResearchLibraryExcerptDto {
  @IsString()
  materialVersionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  locator!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  text!: string;
}
