import { ResearchDecisionAction } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResearchDecisionDto {
  @IsEnum(ResearchDecisionAction)
  action!: ResearchDecisionAction;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  note?: string;
}
