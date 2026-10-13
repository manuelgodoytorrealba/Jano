export type SsrAuthResult = 'ok' | 'unauthorized' | 'unavailable';

type ValidateSsrAuthOptions = {
  backendOrigin: string;
  authorization: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export async function validateSsrAuth({
  backendOrigin,
  authorization,
  fetchImpl = fetch,
  timeoutMs = 5_000,
}: ValidateSsrAuthOptions): Promise<SsrAuthResult> {
  if (!authorization) return 'unauthorized';

  try {
    const response = await fetchImpl(`${backendOrigin}/api/auth/me`, {
      headers: { authorization },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.ok) return 'ok';
    if (response.status === 401 || response.status === 403) return 'unauthorized';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
