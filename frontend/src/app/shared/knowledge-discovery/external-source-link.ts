export function externalSourceLink(value: string | null | undefined): {
  href: string;
  domain: string;
} | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return { href: url.href, domain: url.hostname.replace(/^www\./, '') };
  } catch {
    return null;
  }
}
