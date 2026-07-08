import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddResearchProjectSourceDto {
  @IsString()
  sourceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  note?: string;
}
