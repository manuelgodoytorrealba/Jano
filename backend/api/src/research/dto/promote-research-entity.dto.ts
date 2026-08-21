import { IsString } from 'class-validator';

export class PromoteResearchEntityDto {
  @IsString() canonicalType!: string;
}
