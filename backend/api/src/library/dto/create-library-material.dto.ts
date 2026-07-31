import { LibraryMaterialKind } from '@prisma/client';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

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
}
