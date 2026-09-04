import { createHash } from 'node:crypto';

export function materialIdentity(
  sourceId: string,
  kind: string,
  canonicalUrl: string | null | undefined,
) {
  return `${sourceId}|${kind}|${(canonicalUrl ?? '').trim()}`;
}

export function contentIdentity(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

export function versionAction(
  existingContentHash: string | null | undefined,
  incomingContent: string,
) {
  return existingContentHash === contentIdentity(incomingContent)
    ? ('REUSE_VERSION' as const)
    : ('CREATE_VERSION' as const);
}
