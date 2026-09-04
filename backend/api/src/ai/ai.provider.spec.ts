import { ConfigService } from '@nestjs/config';
import { AIStructuredOutputError } from './ai-structured-output.diagnostics';
import { AIProvider } from './ai.provider';

describe('AIProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('prefers neutral AI_MODEL configuration while keeping OLLAMA_MODEL compatible', () => {
    const provider = new AIProvider({
      get: (key: string) =>
        ({ AI_PROVIDER: 'ollama', AI_MODEL: 'editorial-model', OLLAMA_MODEL: 'legacy-model' })[key],
    } as ConfigService);
    expect(provider.metadata()).toEqual({ provider: 'ollama', model: 'editorial-model' });
  });

  it('retries once when Ollama returns malformed structured output', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: '{' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: '{"claims":[]}' })));
    const config = { get: (key: string) => ({ AI_PROVIDER: 'ollama' })[key] };

    const result = await new AIProvider(config as ConfigService).runStructured({
      task: 'test',
      schemaVersion: '1',
      input: {},
    });

    expect(result.output).toEqual({ claims: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves both malformed retry attempts without accepting previously invalid output', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: '{"entities":[',
            done: true,
            done_reason: 'length',
            eval_count: 1_200,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: '{"entities":',
            done: true,
            done_reason: 'length',
            eval_count: 1_200,
          }),
        ),
      );
    const provider = new AIProvider({
      get: (key: string) => ({ AI_PROVIDER: 'ollama' })[key],
    } as ConfigService);

    const failure = provider.runStructured({
      task: 'test',
      schemaVersion: '1',
      input: { batch: { current: 1, total: 2 } },
      maxOutputTokens: 1_200,
    });

    await expect(failure).rejects.toBeInstanceOf(AIStructuredOutputError);
    await failure.catch((error: AIStructuredOutputError) => {
      expect(error.attempts).toHaveLength(2);
      expect(error.attempts.map((item) => item.rawResponse)).toEqual([
        '{"entities":[',
        '{"entities":',
      ]);
      expect(error.attempts.map((item) => item.category)).toEqual([
        'TRUNCATED_RESPONSE',
        'TRUNCATED_RESPONSE',
      ]);
    });
  });

  it('classifies an empty response without placing raw content in the error message', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ response: '', done: true, done_reason: 'stop', eval_count: 0 }),
        ),
      );
    const provider = new AIProvider({
      get: (key: string) => ({ AI_PROVIDER: 'ollama' })[key],
    } as ConfigService);

    await expect(
      provider.runStructured({ task: 'test', schemaVersion: '1', input: {} }),
    ).rejects.toThrow('category=EMPTY_RESPONSE');
    expect(provider.getStructuredOutputDiagnostics()[0]).toEqual(
      expect.objectContaining({ category: 'EMPTY_RESPONSE', rawResponse: '' }),
    );
  });

  it('retains the pre-existing tolerant parser while strict diagnostics detect wrapper text', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ response: 'Resultado: {"claims":[]} fin', done: true })),
      );
    const provider = new AIProvider({
      get: (key: string) => ({ AI_PROVIDER: 'ollama' })[key],
    } as ConfigService);

    const result = await provider.runStructured({ task: 'test', schemaVersion: '1', input: {} });

    expect(result.output).toEqual({ claims: [] });
    expect(provider.getStructuredOutputDiagnostics()[0]).toEqual(
      expect.objectContaining({
        category: 'JSON_WITH_WRAPPER_TEXT',
        strictJsonValid: false,
        acceptedByCurrentParser: true,
      }),
    );
  });
});
