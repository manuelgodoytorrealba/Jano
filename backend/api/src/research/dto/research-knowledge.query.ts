import { IsIn, IsOptional, IsString } from 'class-validator';

export const RESEARCH_KNOWLEDGE_SCOPES = ['topology', 'focus', 'traceability'] as const;
export const RESEARCH_KNOWLEDGE_FOCUS_TYPES = ['entity', 'relation', 'claim', 'evidence'] as const;

export type ResearchKnowledgeScope = (typeof RESEARCH_KNOWLEDGE_SCOPES)[number];
export type ResearchKnowledgeFocusType = (typeof RESEARCH_KNOWLEDGE_FOCUS_TYPES)[number];

export class ResearchKnowledgeQuery {
  @IsOptional()
  @IsIn(RESEARCH_KNOWLEDGE_SCOPES)
  scope?: ResearchKnowledgeScope;

  @IsOptional()
  @IsIn(RESEARCH_KNOWLEDGE_FOCUS_TYPES)
  focusType?: ResearchKnowledgeFocusType;

  @IsOptional()
  @IsString()
  focusId?: string;
}
