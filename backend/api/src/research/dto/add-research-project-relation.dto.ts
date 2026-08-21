import { IsNotEmpty, IsString } from 'class-validator';

export class AddResearchProjectRelationDto {
  @IsString()
  @IsNotEmpty()
  relatedProjectId!: string;
}
