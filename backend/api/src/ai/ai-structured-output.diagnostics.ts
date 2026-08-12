import { createHash } from 'node:crypto';

export type AIStructuredFailureCategory =
  | 'PROVIDER_TRANSPORT_ERROR'
  | 'EMPTY_RESPONSE'
  | 'MALFORMED_JSON'
  | 'JSON_WITH_WRAPPER_TEXT'
  | 'JSON_WITH_MARKDOWN_FENCE'
  | 'VALID_JSON_SCHEMA_MISMATCH'
  | 'TRUNCATED_RESPONSE'
  | 'UNKNOWN_STRUCTURED_OUTPUT_ERROR';

export type AISchemaValidationError = {
  path: string;
  expected: string;
  received: string;
  message: string;
};

export type OllamaResponseMetadata = {
  done: boolean | null;
  doneReason: string | null;
  evalCount: number | null;
  promptEvalCount: number | null;
  totalDuration: number | null;
  loadDuration: number | null;
  evalDuration: number | null;
  promptEvalDuration: number | null;
};

export type AIStructuredAttemptDiagnostic = {
  attempt: number;
  batch: { current: number; total: number } | null;
  category: AIStructuredFailureCategory | null;
  rawResponse: string | null;
  rawSha256: string | null;
  rawLength: number;
  approximateTokens: number;
  rawStart: string | null;
  rawEnd: string | null;
  containsJsonObject: boolean;
  containsJsonArray: boolean;
  containsMarkdownFence: boolean;
  containsWrapperText: boolean;
  strictJsonValid: boolean;
  parserError: string | null;
  parserErrorPosition: number | null;
  appearsAbruptlyTerminated: boolean;
  unclosedObjectCount: number;
  unclosedArrayCount: number;
  schemaValidationErrors: AISchemaValidationError[];
  responseMetadata: OllamaResponseMetadata;
  acceptedByCurrentParser: boolean;
};

type JsonSchema = {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: unknown[];
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean;
};

const preview = (value: string, fromEnd = false) => {
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim();
  return fromEnd ? normalized.slice(-180) : normalized.slice(0, 180);
};

const received = (value: unknown) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') return `string(${value.slice(0, 80)})`;
  return typeof value;
};

const expectedType = (schema: JsonSchema) =>
  Array.isArray(schema.type) ? schema.type.join('|') : (schema.type ?? 'unspecified');

function schemaErrors(value: unknown, schema: JsonSchema, path = '$'): AISchemaValidationError[] {
  const errors: AISchemaValidationError[] = [];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (types.length && !types.includes(actualType)) {
    return [
      { path, expected: expectedType(schema), received: received(value), message: 'type mismatch' },
    ];
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      expected: `enum(${schema.enum.join('|')})`,
      received: String(value),
      message: 'value is not in enum',
    });
  }
  if (actualType === 'object' && value) {
    const object = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in object)) {
        errors.push({
          path: `${path}.${key}`,
          expected: 'required field',
          received: 'missing',
          message: 'required field is missing',
        });
      }
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in object) errors.push(...schemaErrors(object[key], child, `${path}.${key}`));
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(object)) {
        if (!(key in schema.properties)) {
          errors.push({
            path: `${path}.${key}`,
            expected: 'no additional property',
            received: received(object[key]),
            message: 'additional property is not allowed',
          });
        }
      }
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        expected: `minItems=${schema.minItems}`,
        received: `length=${value.length}`,
        message: 'array is too short',
      });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        expected: `maxItems=${schema.maxItems}`,
        received: `length=${value.length}`,
        message: 'array is too long',
      });
    }
    if (schema.items)
      value.forEach((item, index) =>
        errors.push(...schemaErrors(item, schema.items!, `${path}[${index}]`)),
      );
  }
  return errors;
}

function structuralBalance(value: string) {
  let objects = 0;
  let arrays = 0;
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === '{') objects += 1;
    if (character === '}') objects -= 1;
    if (character === '[') arrays += 1;
    if (character === ']') arrays -= 1;
  }
  return { objects: Math.max(0, objects), arrays: Math.max(0, arrays), openString: inString };
}

export function ollamaMetadata(body: Record<string, unknown>): OllamaResponseMetadata {
  const number = (key: string) => (typeof body[key] === 'number' ? body[key] : null);
  return {
    done: typeof body.done === 'boolean' ? body.done : null,
    doneReason: typeof body.done_reason === 'string' ? body.done_reason : null,
    evalCount: number('eval_count'),
    promptEvalCount: number('prompt_eval_count'),
    totalDuration: number('total_duration'),
    loadDuration: number('load_duration'),
    evalDuration: number('eval_duration'),
    promptEvalDuration: number('prompt_eval_duration'),
  };
}

export function diagnoseStructuredOutput(args: {
  rawResponse: string | null;
  attempt: number;
  batch?: { current: number; total: number } | null;
  responseMetadata?: Partial<OllamaResponseMetadata>;
  outputSchema?: unknown;
  maxOutputTokens?: number;
  acceptedByCurrentParser?: boolean;
}): AIStructuredAttemptDiagnostic {
  const raw = args.rawResponse ?? '';
  const trimmed = raw.trim();
  const metadata: OllamaResponseMetadata = {
    done: args.responseMetadata?.done ?? null,
    doneReason: args.responseMetadata?.doneReason ?? null,
    evalCount: args.responseMetadata?.evalCount ?? null,
    promptEvalCount: args.responseMetadata?.promptEvalCount ?? null,
    totalDuration: args.responseMetadata?.totalDuration ?? null,
    loadDuration: args.responseMetadata?.loadDuration ?? null,
    evalDuration: args.responseMetadata?.evalDuration ?? null,
    promptEvalDuration: args.responseMetadata?.promptEvalDuration ?? null,
  };
  const containsMarkdownFence = /```(?:json)?/i.test(raw);
  const firstObject = trimmed.indexOf('{');
  const lastObject = trimmed.lastIndexOf('}');
  const firstArray = trimmed.indexOf('[');
  const lastArray = trimmed.lastIndexOf(']');
  const containsJsonObject = firstObject >= 0;
  const containsJsonArray = firstArray >= 0;
  const jsonStart =
    [firstObject, firstArray].filter((position) => position >= 0).sort((a, b) => a - b)[0] ?? -1;
  const jsonEnd = Math.max(lastObject, lastArray);
  const balance = structuralBalance(trimmed);
  const containsWrapperText =
    jsonStart > 0 ||
    (balance.objects === 0 &&
      balance.arrays === 0 &&
      !balance.openString &&
      jsonEnd >= 0 &&
      jsonEnd < trimmed.length - 1);
  let parsed: unknown;
  let strictJsonValid = false;
  let parserError: string | null = null;
  let parserErrorPosition: number | null = null;
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
      strictJsonValid = true;
    } catch (error) {
      parserError = error instanceof Error ? error.message : String(error);
      const match = parserError.match(/position\s+(\d+)/i);
      parserErrorPosition = match ? Number(match[1]) : null;
    }
  }
  const schemaValidationErrors =
    strictJsonValid && args.outputSchema && typeof args.outputSchema === 'object'
      ? schemaErrors(parsed, args.outputSchema)
      : [];
  const atTokenLimit =
    metadata.evalCount !== null &&
    args.maxOutputTokens !== undefined &&
    metadata.evalCount >= args.maxOutputTokens;
  const appearsAbruptlyTerminated =
    metadata.done === false ||
    metadata.doneReason === 'length' ||
    ((balance.objects > 0 || balance.arrays > 0 || balance.openString) && atTokenLimit);
  const category: AIStructuredFailureCategory | null = !trimmed
    ? 'EMPTY_RESPONSE'
    : appearsAbruptlyTerminated
      ? 'TRUNCATED_RESPONSE'
      : containsMarkdownFence && !strictJsonValid
        ? 'JSON_WITH_MARKDOWN_FENCE'
        : containsWrapperText && !strictJsonValid
          ? 'JSON_WITH_WRAPPER_TEXT'
          : !strictJsonValid
            ? 'MALFORMED_JSON'
            : schemaValidationErrors.length
              ? 'VALID_JSON_SCHEMA_MISMATCH'
              : null;
  return {
    attempt: args.attempt,
    batch: args.batch ?? null,
    category,
    rawResponse: args.rawResponse,
    rawSha256: args.rawResponse === null ? null : createHash('sha256').update(raw).digest('hex'),
    rawLength: raw.length,
    approximateTokens: metadata.evalCount ?? Math.ceil(raw.length / 4),
    rawStart: raw ? preview(raw) : null,
    rawEnd: raw ? preview(raw, true) : null,
    containsJsonObject,
    containsJsonArray,
    containsMarkdownFence,
    containsWrapperText,
    strictJsonValid,
    parserError,
    parserErrorPosition,
    appearsAbruptlyTerminated,
    unclosedObjectCount: balance.objects,
    unclosedArrayCount: balance.arrays,
    schemaValidationErrors,
    responseMetadata: metadata,
    acceptedByCurrentParser: args.acceptedByCurrentParser ?? false,
  };
}

export function transportDiagnostic(args: {
  attempt: number;
  batch?: { current: number; total: number } | null;
  message: string;
}): AIStructuredAttemptDiagnostic {
  return {
    ...diagnoseStructuredOutput({ rawResponse: null, attempt: args.attempt, batch: args.batch }),
    category: 'PROVIDER_TRANSPORT_ERROR',
    parserError: args.message,
  };
}

export class AIStructuredOutputError extends Error {
  constructor(
    public readonly attempts: AIStructuredAttemptDiagnostic[],
    message = 'AI structured output failed',
  ) {
    const last = attempts.at(-1);
    super(
      `${message} [category=${last?.category ?? 'UNKNOWN_STRUCTURED_OUTPUT_ERROR'} attempts=${attempts.length} rawLength=${last?.rawLength ?? 0} finishReason=${last?.responseMetadata.doneReason ?? 'unknown'}]`,
    );
    this.name = 'AIStructuredOutputError';
  }
}
