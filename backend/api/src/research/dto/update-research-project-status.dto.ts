import { ResearchProjectStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateResearchProjectStatusDto {
  @IsEnum(ResearchProjectStatus)
  status!: ResearchProjectStatus;
}
