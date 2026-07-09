import { ResearchProposalReviewState } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ReviewResearchFindingProposalDto {
  @IsEnum(ResearchProposalReviewState)
  reviewState!: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>;
}
