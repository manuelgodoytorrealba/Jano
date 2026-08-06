import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

export type AIProviderPort = {
  metadata(): AIProviderMetadata;
  isAvailable(): boolean;
  runStructured(request: AIStructuredRequest): Promise<AIStructuredResult>;
};

@Injectable()
export class AIProvider {
  private readonly provider: string;
  private readonly model: string;
  private readonly ollamaBaseUrl: string;

  constructor(config: ConfigService) {
    this.provider = config.get<string>('AI_PROVIDER') ?? 'noop';
    this.model = config.get<string>('OLLAMA_MODEL') ?? 'qwen2.5:7b';
    this.ollamaBaseUrl = (
      config.get<string>('OLLAMA_BASE_URL') ?? 'http://127.0.0.1:11434'
    ).replace(/\/$/, '');
  }

  metadata(): AIProviderMetadata {
    return this.provider === 'ollama'
      ? { provider: 'ollama', model: this.model }
      : { provider: 'noop', model: 'unavailable' };
  }

  isAvailable(): boolean {
    return this.provider === 'ollama';
  }

  async runStructured(request: AIStructuredRequest): Promise<AIStructuredResult> {
    if (!this.isAvailable()) throw new Error('AI provider is not available');
    const startedAt = Date.now();
    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        options: { temperature: 0.25, num_predict: 500 },
        prompt: [
          'Eres un asistente editorial de investigación cultural. Responde en español.',
          'Usa exclusivamente el contexto proporcionado. No inventes hechos, citas ni referencias.',
          'Devuelve JSON válido, sin markdown, conforme al contrato solicitado.',
          `Tarea: ${request.task} (contrato ${request.schemaVersion}).`,
          JSON.stringify(request.input),
        ].join('\n\n'),
      }),
    });
    if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
    const body = (await response.json()) as { response?: string };
    if (!body.response) throw new Error('Ollama no devolvió contenido');
    try {
      return {
        output: JSON.parse(body.response),
        durationMs: Date.now() - startedAt,
        costCents: 0,
      };
    } catch {
      throw new Error('Ollama no devolvió JSON válido');
    }
  }
}
