import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadHomeDeckImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  photoBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  license?: string;
}
