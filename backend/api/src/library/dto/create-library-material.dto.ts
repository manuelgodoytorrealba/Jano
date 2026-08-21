import { LibraryMaterialKind } from '@prisma/client';
import {
  IsInt,
  IsIn,
  Max,
  Min,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLibraryMaterialDto {
  @IsIn([LibraryMaterialKind.TEXT, LibraryMaterialKind.URL])
  kind!: Extract<LibraryMaterialKind, 'TEXT' | 'URL'>;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @ValidateIf((dto: CreateLibraryMaterialDto) => dto.kind === LibraryMaterialKind.TEXT)
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  content?: string;

  @ValidateIf((dto: CreateLibraryMaterialDto) => dto.kind === LibraryMaterialKind.URL)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  author?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  year?: number;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  sourceUrl?: string;
}
