import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchProjectDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(1200)
  objective!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  scope?: string;
}
