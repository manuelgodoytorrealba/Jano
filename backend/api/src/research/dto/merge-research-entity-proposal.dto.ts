import { IsString } from 'class-validator';

export class MergeResearchEntityProposalDto {
  @IsString() entityId!: string;
}
