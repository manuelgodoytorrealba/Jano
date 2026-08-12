import { diagnoseStructuredOutput } from './ai-structured-output.diagnostics';

const schema = {
  type: 'object',
  required: ['entities'],
  properties: {
    entities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind'],
        properties: { kind: { type: 'string', enum: ['PERSON', 'WORK'] } },
      },
    },
  },
};

describe('structured output diagnostics', () => {
  it('classifies an empty response', () => {
    expect(diagnoseStructuredOutput({ rawResponse: '', attempt: 1 }).category).toBe(
      'EMPTY_RESPONSE',
    );
  });

  it('classifies malformed JSON and preserves parser details', () => {
    const diagnostic = diagnoseStructuredOutput({ rawResponse: '{"entities":[', attempt: 1 });
    expect(diagnostic.category).toBe('MALFORMED_JSON');
    expect(diagnostic.strictJsonValid).toBe(false);
    expect(diagnostic.parserError).toBeTruthy();
    expect(diagnostic.unclosedObjectCount).toBe(1);
    expect(diagnostic.unclosedArrayCount).toBe(1);
  });

  it('detects fenced JSON without mutating or accepting it in the strict diagnostic', () => {
    const raw = '```json\n{"entities":[]}\n```';
    const diagnostic = diagnoseStructuredOutput({ rawResponse: raw, attempt: 1 });
    expect(diagnostic.category).toBe('JSON_WITH_MARKDOWN_FENCE');
    expect(diagnostic.strictJsonValid).toBe(false);
    expect(diagnostic.rawResponse).toBe(raw);
  });

  it('detects wrapper text without extracting its JSON substring', () => {
    const raw = 'Resultado: {"entities":[]} fin';
    const diagnostic = diagnoseStructuredOutput({ rawResponse: raw, attempt: 1 });
    expect(diagnostic.category).toBe('JSON_WITH_WRAPPER_TEXT');
    expect(diagnostic.strictJsonValid).toBe(false);
    expect(diagnostic.rawResponse).toBe(raw);
  });

  it('reports schema mismatch with a useful path', () => {
    const diagnostic = diagnoseStructuredOutput({
      rawResponse: '{"entities":[{"kind":"CONCEPT"}]}',
      attempt: 1,
      outputSchema: schema,
    });
    expect(diagnostic.category).toBe('VALID_JSON_SCHEMA_MISMATCH');
    expect(diagnostic.schemaValidationErrors).toContainEqual(
      expect.objectContaining({ path: '$.entities[0].kind', received: 'CONCEPT' }),
    );
  });

  it('uses Ollama token termination metadata for high-confidence truncation', () => {
    const diagnostic = diagnoseStructuredOutput({
      rawResponse: '{"entities":[',
      attempt: 1,
      maxOutputTokens: 1_200,
      responseMetadata: { done: true, doneReason: 'length', evalCount: 1_200 },
    });
    expect(diagnostic.category).toBe('TRUNCATED_RESPONSE');
    expect(diagnostic.appearsAbruptlyTerminated).toBe(true);
    expect(diagnostic.approximateTokens).toBe(1_200);
  });
});
