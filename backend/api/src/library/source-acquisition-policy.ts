/** Acquisition signals never change documentary credibility or semantic decisions. */
export type AccessState =
  | 'ACCESSIBLE_HTML'
  | 'ACCESSIBLE_PDF'
  | 'ACCESSIBLE_API'
  | 'ACCESSIBLE_ALTERNATIVE'
  | 'RATE_LIMITED'
  | 'BLOCKED_HTML'
  | 'BLOCKED_BUT_ALTERNATIVE_AVAILABLE'
  | 'MANUAL_ONLY'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'LOW_YIELD'
  | 'UNKNOWN';
export type AcquisitionCandidate = {
  url: string;
  title: string;
  publisher?: string;
  documentaryQuality: number;
  targetRelevance: number;
  qualityClass: 'DOCUMENTARY' | 'DENSE_PUBLICATION' | 'STRUCTURED_REFERENCE' | 'LOW_VALUE';
  provenanceOnly?: boolean;
  alternatives?: Array<{
    url: string;
    title: string;
    publisher: string;
    strategy: 'OFFICIAL_PDF' | 'OFFICIAL_API' | 'OFFICIAL_ALTERNATE';
    basis: string;
    documentaryQuality: number;
    targetRelevance: number;
  }>;
};
export function normalizeSourceUrl(
  raw: string,
  verifiedEquivalents: Record<string, string> = {},
): string {
  const u = new URL(raw);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
    throw new Error('Only public HTTP(S) source URLs are allowed');
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_.+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i.test(key)) u.searchParams.delete(key);
  // Preserve query multiplicity/order, language, path and scheme unless equivalence is verified.
  // Removing these blindly merges different documents (including signed URLs and translations).
  const normalized = u.toString();
  // Equivalence must come from an observed publisher redirect/canonical representation, never a locale guess.
  return verifiedEquivalents[normalized]
    ? normalizeSourceUrl(verifiedEquivalents[normalized])
    : normalized;
}
export function lowValueSource(c: AcquisitionCandidate) {
  if (c.provenanceOnly) return false;
  const u = new URL(c.url);
  return (
    c.qualityClass === 'LOW_VALUE' ||
    c.documentaryQuality < 60 ||
    c.targetRelevance < 50 ||
    /\/(shop|store|search|calendar|tag|tags|login|cart)(\/|$)/i.test(u.pathname) ||
    /\.(jpe?g|png|gif|webp|svg|ico)(\?|$)/i.test(u.pathname) ||
    /tax form|form 990|annual report|artist directory|navigation index/i.test(c.title)
  );
}
export function retryAfterMs(
  value: string | null,
  now: number,
  attempt: number,
  random = Math.random(),
) {
  const seconds = value && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) * 1000 : NaN;
  const date = value ? Date.parse(value) - now : NaN;
  return (
    Math.max(
      1_000 * 2 ** Math.min(attempt, 8),
      Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? Math.max(0, date) : 0,
    ) + Math.floor(random * 500)
  );
}
export function contentRoute(mime: string) {
  if (/^application\/pdf\b/i.test(mime)) return 'PDF';
  if (/^(text\/html|application\/xhtml\+xml)\b/i.test(mime)) return 'HTML';
  if (/^(application\/(?:[\w.-]+\+)?json)\b/i.test(mime)) return 'JSON';
  if (/^text\/plain\b/i.test(mime)) return 'TEXT';
  return 'UNSUPPORTED';
}
export function sourceScore(
  c: AcquisitionCandidate,
  access: number,
  history = { yield: 0, block: 0, rateLimit: 0 },
  domainSelected = 0,
) {
  // Quality dominates; access breaks ties between comparably strong documentary sources.
  return (
    c.documentaryQuality * 4 +
    c.targetRelevance * 3 +
    history.yield * 20 +
    access * 20 +
    (c.qualityClass === 'DENSE_PUBLICATION' ? 15 : 0) +
    15 / (1 + domainSelected) -
    history.block * 20 -
    history.rateLimit * 10 -
    (1 - history.yield) * 5
  );
}
