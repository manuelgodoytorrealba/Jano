import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateResearchDraftRevisionDto {
  @IsString()
  content!: string;
}
