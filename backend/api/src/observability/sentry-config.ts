export function readSampleRate(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
}

export function sentryOptions(env: NodeJS.ProcessEnv) {
  const dsn = env.SENTRY_DSN?.trim();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: env.SENTRY_ENVIRONMENT?.trim() || env.NODE_ENV || 'development',
    release: env.JANO_RELEASE?.trim() || undefined,
    sendDefaultPii: false,
    tracesSampleRate: readSampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
  };
}
