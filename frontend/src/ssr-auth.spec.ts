import { describe, expect, it, vi } from 'vitest';
import { validateSsrAuth } from './ssr-auth';

describe('validateSsrAuth', () => {
  it('does not call the backend when no credentials are present', async () => {
    const fetchImpl = vi.fn();

    await expect(
      validateSsrAuth({ backendOrigin: 'http://backend:3000', authorization: null, fetchImpl }),
    ).resolves.toBe('unauthorized');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('accepts a valid backend session', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(
      validateSsrAuth({
        backendOrigin: 'http://backend:3000',
        authorization: 'Bearer token',
        fetchImpl,
      }),
    ).resolves.toBe('ok');
  });

  it.each([401, 403])('treats status %s as an invalid session', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status }));

    await expect(
      validateSsrAuth({
        backendOrigin: 'http://backend:3000',
        authorization: 'Bearer expired',
        fetchImpl,
      }),
    ).resolves.toBe('unauthorized');
  });

  it.each([
    ['backend error', vi.fn().mockResolvedValue(new Response(null, { status: 503 }))],
    ['network error', vi.fn().mockRejectedValue(new Error('connection refused'))],
  ])('keeps the session when authentication is unavailable: %s', async (_label, fetchImpl) => {
    await expect(
      validateSsrAuth({
        backendOrigin: 'http://backend:3000',
        authorization: 'Bearer token',
        fetchImpl,
        timeoutMs: 10,
      }),
    ).resolves.toBe('unavailable');
  });
});
