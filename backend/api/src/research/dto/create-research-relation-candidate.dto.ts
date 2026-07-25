import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateResearchRelationCandidateDto {
  @IsString() fromCandidateId!: string;
  @IsString() toCandidateId!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) evidenceIds!: string[];
  @IsOptional() @IsString() relationTypeId?: string;
  @IsOptional() @IsString() explanation?: string;
}
