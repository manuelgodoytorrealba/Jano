import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateEntityClassificationDto {
  @IsString()
  termId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number | null;

  @IsOptional()
  @IsString()
  source?: string;
}
