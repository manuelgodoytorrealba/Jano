import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIStructuredOutputError,
  diagnoseStructuredOutput,
  ollamaMetadata,
  transportDiagnostic,
  type AIStructuredAttemptDiagnostic,
} from './ai-structured-output.diagnostics';

export type AIProviderMetadata = {
  provider: string;
  model: string;
  version?: string;
};

export type AIStructuredRequest = {
  task: string;
  schemaVersion: string;
  input: unknown;
  outputSchema?: unknown;
  maxOutputTokens?: number;
  timeoutMs?: number;
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
  getStructuredOutputDiagnostics?(): readonly AIStructuredAttemptDiagnostic[];
};

@Injectable()
export class AIProvider {
  private readonly provider: string;
  private readonly model: string;
  private readonly ollamaBaseUrl: string;
  private readonly structuredOutputDiagnostics: AIStructuredAttemptDiagnostic[] = [];

  constructor(config: ConfigService) {
    this.provider = config.get<string>('AI_PROVIDER') ?? 'noop';
    this.model =
      config.get<string>('AI_MODEL') ?? config.get<string>('OLLAMA_MODEL') ?? 'qwen2.5:7b';
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

  getStructuredOutputDiagnostics(): readonly AIStructuredAttemptDiagnostic[] {
    return this.structuredOutputDiagnostics;
  }

  async runStructured(request: AIStructuredRequest): Promise<AIStructuredResult> {
    if (!this.isAvailable()) throw new Error('AI provider is not available');
    const startedAt = Date.now();
    const attemptDiagnostics: AIStructuredAttemptDiagnostic[] = [];
    const batch = this.batchFromInput(request.input);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: AbortSignal.timeout(request.timeoutMs ?? 60_000),
          body: JSON.stringify({
            model: this.model,
            stream: false,
            think: false,
            format: request.outputSchema ?? 'json',
            options: { temperature: 0.2, num_predict: request.maxOutputTokens ?? 1_200 },
            prompt: [
              'Eres un asistente editorial de investigación cultural. Responde en español.',
              'Usa exclusivamente el contexto proporcionado. No inventes hechos, citas ni referencias.',
              'Devuelve JSON válido, sin fences ni texto fuera del objeto; los campos string pueden contener Markdown sólo cuando la tarea lo exija.',
              `Tarea: ${request.task} (contrato ${request.schemaVersion}).`,
              JSON.stringify(request.input),
            ].join('\n\n'),
          }),
        });
      } catch (error) {
        const diagnostic = transportDiagnostic({
          attempt: attempt + 1,
          batch,
          message: error instanceof Error ? error.message : String(error),
        });
        this.structuredOutputDiagnostics.push(diagnostic);
        throw new AIStructuredOutputError(
          [...attemptDiagnostics, diagnostic],
          'Ollama transport failed',
        );
      }
      if (!response.ok) {
        const diagnostic = transportDiagnostic({
          attempt: attempt + 1,
          batch,
          message: `Ollama respondió ${response.status}`,
        });
        this.structuredOutputDiagnostics.push(diagnostic);
        throw new AIStructuredOutputError(
          [...attemptDiagnostics, diagnostic],
          'Ollama transport failed',
        );
      }
      let body: Record<string, unknown>;
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch (error) {
        const diagnostic = transportDiagnostic({
          attempt: attempt + 1,
          batch,
          message: error instanceof Error ? error.message : String(error),
        });
        this.structuredOutputDiagnostics.push(diagnostic);
        throw new AIStructuredOutputError(
          [...attemptDiagnostics, diagnostic],
          'Invalid Ollama response envelope',
        );
      }
      const rawResponse = typeof body.response === 'string' ? body.response : null;
      const diagnosticInput = {
        rawResponse,
        attempt: attempt + 1,
        batch,
        responseMetadata: ollamaMetadata(body),
        outputSchema: request.outputSchema,
        maxOutputTokens: request.maxOutputTokens ?? 1_200,
      };
      if (!rawResponse) {
        const diagnostic = diagnoseStructuredOutput(diagnosticInput);
        this.structuredOutputDiagnostics.push(diagnostic);
        throw new AIStructuredOutputError(
          [...attemptDiagnostics, diagnostic],
          'Ollama returned no content',
        );
      }
      try {
        const output = this.parseStructuredOutput(rawResponse);
        const diagnostic = diagnoseStructuredOutput({
          ...diagnosticInput,
          acceptedByCurrentParser: true,
        });
        this.structuredOutputDiagnostics.push(diagnostic);
        return {
          output,
          durationMs: Date.now() - startedAt,
          costCents: 0,
        };
      } catch {
        const diagnostic = diagnoseStructuredOutput(diagnosticInput);
        attemptDiagnostics.push(diagnostic);
        this.structuredOutputDiagnostics.push(diagnostic);
        if (attempt === 1) throw new AIStructuredOutputError(attemptDiagnostics);
      }
    }
    throw new Error('Ollama no devolvió JSON válido');
  }

  private batchFromInput(input: unknown): { current: number; total: number } | null {
    if (!input || typeof input !== 'object') return null;
    const batch = (input as Record<string, unknown>).batch;
    if (!batch || typeof batch !== 'object') return null;
    const current = (batch as Record<string, unknown>).current;
    const total = (batch as Record<string, unknown>).total;
    return typeof current === 'number' && typeof total === 'number' ? { current, total } : null;
  }

  private parseStructuredOutput(response: string) {
    const trimmed = response
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('Ollama no devolvió JSON válido');
      return JSON.parse(trimmed.slice(start, end + 1));
    }
  }
}
