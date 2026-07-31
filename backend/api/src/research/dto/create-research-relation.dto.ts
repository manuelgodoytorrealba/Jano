import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateResearchRelationDto {
  @IsString() fromEntityId!: string;
  @IsString() toEntityId!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) claimIds!: string[];
  @IsOptional() @IsString() relationTypeId?: string;
  @IsOptional() @IsString() explanation?: string;
}
