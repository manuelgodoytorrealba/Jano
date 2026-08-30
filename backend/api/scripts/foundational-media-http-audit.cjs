/* Read-only GET audit for media URLs captured by foundational-production-snapshot.cjs. */
'use strict';

const fs = require('node:fs');
const { URL } = require('node:url');

const snapshotPath = process.argv[2];
if (!snapshotPath) {
  throw new Error('Usage: node foundational-media-http-audit.cjs <snapshot.json>');
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const foundationalSlugs = new Set(snapshot.catalog.entities.map((entity) => entity.slug));
const linksByMedia = new Map();
for (const link of snapshot.db.entityMedia) {
  const links = linksByMedia.get(link.mediaId) || [];
  links.push(link);
  linksByMedia.set(link.mediaId, links);
}

function selectedUrl(media) {
  return media.displayUrl || media.url || media.canonicalUrl || null;
}

function providerDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function audit(media) {
  const links = linksByMedia.get(media.id) || [];
  const foundationalLinks = links.filter((link) => foundationalSlugs.has(link.slug));
  const url = selectedUrl(media);
  const startedAt = Date.now();
  const base = {
    mediaId: media.id,
    links: links.map((link) => ({
      entity: link.slug,
      entityTitle: link.title,
      entityType: link.type,
      role: link.role,
      isPrimary: link.isPrimary,
      foundational: foundationalSlugs.has(link.slug),
    })),
    foundationalEntities: foundationalLinks.map((link) => link.slug),
    linked: links.length > 0,
    url,
    provider: media.provider ?? null,
    domain: providerDomain(url),
    sourcePageUrl: media.sourcePageUrl ?? null,
    declaredMimeType: media.mimeType ?? null,
    declaredFileSize: media.fileSize ?? null,
    declaredWidth: media.width ?? null,
    declaredHeight: media.height ?? null,
    license: media.license ?? null,
  };

  if (!url) return { ...base, status: null, result: 'BAD_URL', error: 'Missing URL' };

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'JANO-Foundational-Read-Only-Audit/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');
    const isImage = Boolean(contentType && contentType.toLowerCase().startsWith('image/'));
    return {
      ...base,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      contentType,
      responseBytes: body.byteLength,
      durationMs: Date.now() - startedAt,
      result: response.ok && isImage && body.byteLength > 0 ? 'HTTP_VALID' : 'HTTP_INVALID',
      error: null,
    };
  } catch (error) {
    return {
      ...base,
      status: null,
      redirected: null,
      finalUrl: null,
      contentType: null,
      responseBytes: null,
      durationMs: Date.now() - startedAt,
      result: 'REQUEST_FAILED',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results = [];
  for (const media of snapshot.db.media) {
    results.push(await audit(media));
  }
  process.stdout.write(
    `${JSON.stringify({ generatedAt: new Date().toISOString(), mode: 'READ_ONLY_GET', results }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
