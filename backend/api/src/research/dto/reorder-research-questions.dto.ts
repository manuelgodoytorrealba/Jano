import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderResearchQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds!: string[];
}
