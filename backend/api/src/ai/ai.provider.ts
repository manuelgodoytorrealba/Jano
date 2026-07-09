import { Injectable } from '@nestjs/common';

export type AIProviderMetadata = {
  provider: string;
  model: string;
  version?: string;
};

export type AIStructuredRequest = {
  task: string;
  schemaVersion: string;
  input: unknown;
};

export type AIStructuredResult = {
  output: unknown;
  durationMs?: number;
  costCents?: number;
};

@Injectable()
export class AIProvider {
  metadata(): AIProviderMetadata {
    return { provider: 'noop', model: 'unavailable' };
  }

  isAvailable(): boolean {
    return false;
  }

  async runStructured(_request: AIStructuredRequest): Promise<AIStructuredResult> {
    throw new Error('AI provider is not available');
  }
}
