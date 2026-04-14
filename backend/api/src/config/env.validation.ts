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

function readNodeEnv(env: RawEnv): AppEnv['NODE_ENV'] {
  const nodeEnv = readString(env, 'NODE_ENV') ?? 'development';

  if (nodeEnv === 'development' || nodeEnv === 'production' || nodeEnv === 'test') {
    return nodeEnv;
  }

  throw new Error(error(`Invalid env var: NODE_ENV must be development, production or test`));
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
  const FRONTEND_ORIGIN = readString(env, 'FRONTEND_ORIGIN') ?? 'http://localhost:4200';
  const DATABASE_URL = requireString(env, 'DATABASE_URL');
  const MEDIA_PUBLIC_BASE_URL =
    readString(env, 'MEDIA_PUBLIC_BASE_URL') ?? `http://localhost:${PORT}`;

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
  };

  logEnvSummary(validatedEnv, usingFallbackJwtSecret);
  return validatedEnv;
}
