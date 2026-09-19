function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveMediaPublicBaseUrl(rawValue: string | null | undefined): string {
  const trimmed = rawValue?.trim();
  return trimmed ? trimTrailingSlashes(trimmed) : '';
}

export function buildPublicUploadUrl(storageKey: string, mediaPublicBaseUrl: string): string {
  const normalizedKey = storageKey.replace(/^\/+/, '');
  return mediaPublicBaseUrl
    ? `${mediaPublicBaseUrl}/uploads/${normalizedKey}`
    : `/uploads/${normalizedKey}`;
}

export function buildLocalUploadPath(storageKey: string): string {
  return `/uploads/${storageKey.replace(/^\/+/, '')}`;
}

export function resolveStoredMediaUrl(
  originType: string | null | undefined,
  storageKey: string | null | undefined,
  fallbackUrl: string | null | undefined,
): string | null {
  if ((originType === 'UPLOAD' || originType === 'INGESTED') && storageKey?.trim()) {
    return buildLocalUploadPath(storageKey);
  }

  return fallbackUrl?.trim() || null;
}

export function normalizeStoredUploadUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/uploads\//i.test(trimmed)) {
    const normalized = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  return trimmed;
}
