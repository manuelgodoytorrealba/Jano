import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { MetricsService } from './metrics';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(value: string | undefined): string {
  const candidate = value?.trim();
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  metrics?: MetricsService,
): void {
  const requestId = resolveRequestId(req.get('x-request-id'));
  const startedAt = process.hrtime.bigint();
  let logged = false;

  res.setHeader('X-Request-Id', requestId);

  const logCompletion = (aborted: boolean) => {
    if (logged) return;
    logged = true;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const status = aborted ? 499 : res.statusCode;
    metrics?.recordRequest(req.method, status, durationMs);
    const entry = {
      timestamp: new Date().toISOString(),
      level: aborted || res.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  };

  res.once('finish', () => logCompletion(false));
  res.once('close', () => logCompletion(!res.writableFinished));
  next();
}
