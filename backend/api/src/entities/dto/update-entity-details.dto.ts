import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEntityDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  authorNation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  materials?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  dimensions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  collection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  city?: string;

  @IsOptional()
  @IsInt()
  birthYear?: number | null;

  @IsOptional()
  @IsInt()
  deathYear?: number | null;

  @IsOptional()
  @IsString()
  disciplines?: string;

  @IsOptional()
  @IsString()
  bioShort?: string;

  @IsOptional()
  @IsString()
  links?: string;

  @IsOptional()
  @IsString()
  definition?: string;
}
