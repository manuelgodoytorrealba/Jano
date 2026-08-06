import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class AskResearchAssistantDto {
  @IsOptional()
  @IsString()
  @MaxLength(2400)
  message?: string;

  @IsOptional()
  @IsISO8601()
  conversationStartedAt?: string;
}
