import { ResearchMaterialKind } from '@prisma/client';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateResearchMaterialDto {
  @IsIn([ResearchMaterialKind.TEXT, ResearchMaterialKind.URL])
  kind!: Extract<ResearchMaterialKind, 'TEXT' | 'URL'>;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @ValidateIf((dto: CreateResearchMaterialDto) => dto.kind === ResearchMaterialKind.TEXT)
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  content?: string;

  @ValidateIf((dto: CreateResearchMaterialDto) => dto.kind === ResearchMaterialKind.URL)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url?: string;
}

export class CreateResearchPdfMaterialDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;
}
