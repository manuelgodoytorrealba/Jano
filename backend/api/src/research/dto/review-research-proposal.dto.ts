import { ResearchProposalReviewState } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ReviewResearchProposalDto {
  @IsEnum(ResearchProposalReviewState)
  reviewState!: ResearchProposalReviewState;
}
