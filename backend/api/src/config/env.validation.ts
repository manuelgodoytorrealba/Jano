import { error, muted, success, warning } from './terminal';

type RawEnv = Record<string, unknown>;

type AppEnv = {
  NODE_ENV: 'development' | 'production' | 'test';
  HOST: string;
  PORT: number;
  FRONTEND_ORIGIN: string;
  DATABASE_URL: string;
  MEDIA_PUBLIC_BASE_URL: string;
  JWT_SECRET: string;
  AUTH_RATE_LIMIT: number;
  AUTH_RATE_LIMIT_TTL_SECONDS: number;
  PASSWORD_RESET_TOKEN_TTL_MINUTES: number;
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: number;
  APP_PUBLIC_URL: string;
  MAIL_PROVIDER: 'console' | 'resend';
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
  AI_PROVIDER: 'noop' | 'ollama';
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;
};

const DEV_FALLBACK_JWT_SECRET = 'dev-secret-change-me';
let hasLoggedEnvSummary = false;

function readString(env: RawEnv, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requireString(env: RawEnv, key: string): string {
  const value = readString(env, key);

  if (!value) {
    throw new Error(error(`Missing env var: ${key}`));
  }

  return value;
}

function readPort(env: RawEnv, key: string, fallback: number): number {
  const rawValue = readString(env, key);

  if (!rawValue) {
    return fallback;
  }

  const port = Number(rawValue);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(error(`Invalid env var: ${key} must be a valid port`));
  }

  return port;
}

function readPositiveInteger(env: RawEnv, key: string, fallback: number): number {
  const rawValue = readString(env, key);
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(error(`Invalid env var: ${key} must be a positive integer`));
  }

  return value;
}

function readNodeEnv(env: RawEnv): AppEnv['NODE_ENV'] {
  const nodeEnv = readString(env, 'NODE_ENV') ?? 'development';

  if (nodeEnv === 'development' || nodeEnv === 'production' || nodeEnv === 'test') {
    return nodeEnv;
  }

  throw new Error(error(`Invalid env var: NODE_ENV must be development, production or test`));
}

function readAIProvider(env: RawEnv): AppEnv['AI_PROVIDER'] {
  const provider = readString(env, 'AI_PROVIDER') ?? 'noop';
  if (provider === 'noop' || provider === 'ollama') return provider;
  throw new Error(error('Invalid env var: AI_PROVIDER must be noop or ollama'));
}

function logEnvSummary(env: AppEnv, usingFallbackJwtSecret: boolean) {
  if (hasLoggedEnvSummary) {
    return;
  }

  hasLoggedEnvSummary = true;

  console.log(success(`Environment validated for ${env.NODE_ENV}`));
  console.log(muted(`HOST=${env.HOST} PORT=${env.PORT}`));
  console.log(muted(`FRONTEND_ORIGIN=${env.FRONTEND_ORIGIN}`));

  if (usingFallbackJwtSecret) {
    console.warn(
      warning('Using insecure dev fallback for JWT_SECRET. Set JWT_SECRET in backend/api/.env.'),
    );
  }
}

export function validateEnv(env: RawEnv): AppEnv {
  const NODE_ENV = readNodeEnv(env);
  const PORT = readPort(env, 'PORT', 3000);
  const HOST = readString(env, 'HOST') ?? '0.0.0.0';
  const FRONTEND_ORIGIN =
    readString(env, 'FRONTEND_ORIGIN') ??
    'http://localhost:4200,http://localhost:4300,http://127.0.0.1:4200,http://127.0.0.1:4300';
  const DATABASE_URL = requireString(env, 'DATABASE_URL');
  const MEDIA_PUBLIC_BASE_URL =
    readString(env, 'MEDIA_PUBLIC_BASE_URL') ?? `http://localhost:${PORT}`;
  const AI_PROVIDER = readAIProvider(env);
  const OLLAMA_BASE_URL = readString(env, 'OLLAMA_BASE_URL') ?? 'http://127.0.0.1:11434';
  const OLLAMA_MODEL = readString(env, 'OLLAMA_MODEL') ?? 'qwen2.5:7b';
  const AUTH_RATE_LIMIT = readPositiveInteger(env, 'AUTH_RATE_LIMIT', 10);
  const AUTH_RATE_LIMIT_TTL_SECONDS = readPositiveInteger(env, 'AUTH_RATE_LIMIT_TTL_SECONDS', 60);
  const PASSWORD_RESET_TOKEN_TTL_MINUTES = readPositiveInteger(
    env,
    'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    45,
  );
  const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = readPositiveInteger(
    env,
    'EMAIL_VERIFICATION_TOKEN_TTL_HOURS',
    24,
  );
  const APP_PUBLIC_URL = readString(env, 'APP_PUBLIC_URL') ?? 'http://localhost:4200';
  const MAIL_PROVIDER =
    readString(env, 'MAIL_PROVIDER') ?? (NODE_ENV === 'production' ? 'resend' : 'console');
  if (MAIL_PROVIDER !== 'console' && MAIL_PROVIDER !== 'resend') {
    throw new Error(error('Invalid env var: MAIL_PROVIDER must be console or resend'));
  }
  const MAIL_FROM = readString(env, 'MAIL_FROM');
  const RESEND_API_KEY = readString(env, 'RESEND_API_KEY');
  if (NODE_ENV === 'production' && (!MAIL_FROM || !RESEND_API_KEY || MAIL_PROVIDER !== 'resend')) {
    throw new Error(
      error(
        'Production password recovery requires MAIL_PROVIDER=resend, MAIL_FROM and RESEND_API_KEY',
      ),
    );
  }

  let JWT_SECRET = readString(env, 'JWT_SECRET');
  let usingFallbackJwtSecret = false;

  if (!JWT_SECRET) {
    if (NODE_ENV === 'production') {
      throw new Error(error('Missing env var: JWT_SECRET'));
    }

    JWT_SECRET = DEV_FALLBACK_JWT_SECRET;
    usingFallbackJwtSecret = true;
  }

  const validatedEnv: AppEnv = {
    NODE_ENV,
    HOST,
    PORT,
    FRONTEND_ORIGIN,
    DATABASE_URL,
    MEDIA_PUBLIC_BASE_URL,
    JWT_SECRET,
    AUTH_RATE_LIMIT,
    AUTH_RATE_LIMIT_TTL_SECONDS,
    PASSWORD_RESET_TOKEN_TTL_MINUTES,
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
    APP_PUBLIC_URL: APP_PUBLIC_URL.replace(/\/+$/, ''),
    MAIL_PROVIDER,
    MAIL_FROM,
    RESEND_API_KEY,
    AI_PROVIDER,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
  };

  logEnvSummary(validatedEnv, usingFallbackJwtSecret);
  return validatedEnv;
}
