import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const RESEARCH_PROPOSAL_ACTIONS = [
  'APPROVE',
  'REJECT',
  'DEFER',
  'REROUTE',
  'SPLIT',
  'RESOLVE_TO_EXISTING',
  'APPROVE_NEW_ENTITY',
  'APPROVE_RELATION',
  'REJECT_DUPLICATE',
  'REQUEST_MORE_CONTEXT',
] as const;
export type ResearchProposalAction = (typeof RESEARCH_PROPOSAL_ACTIONS)[number];

export class ResearchProposalActionDto {
  @IsIn(RESEARCH_PROPOSAL_ACTIONS)
  action!: ResearchProposalAction;

  @IsOptional() @IsString() canonicalEntityId?: string;
  @IsOptional() @IsString() @MaxLength(180) targetTitle?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(1_200, { each: true })
  childTitles?: string[];
}
