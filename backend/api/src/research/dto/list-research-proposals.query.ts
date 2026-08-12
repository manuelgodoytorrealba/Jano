import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const REVIEW_STATES = ['PENDING', 'REVIEWED', 'REJECTED'] as const;

export class ListResearchProposalsQuery {
  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsIn(REVIEW_STATES)
  reviewState?: (typeof REVIEW_STATES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 24;
}
