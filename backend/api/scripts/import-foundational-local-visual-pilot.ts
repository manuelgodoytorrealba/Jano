import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { PrismaClient, MediaOriginType, MediaRole, MediaProvider } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../src/common/media-url.util';
import { foundationalV1VisualPilot } from '../prisma/editorial/foundational-v1-visual-pilot';

const args = process.argv.slice(2);
if (args.length > 1 || (args[0] && args[0] !== '--apply' && args[0] !== '--dry-run')) {
  throw new Error(
    'Usage: import-foundational-local-visual-pilot.ts [--dry-run|--apply]. Default is dry-run.',
  );
}
const apply = args[0] === '--apply';
const MAX_BYTES = 15 * 1024 * 1024;
const USER_AGENT = 'JANO-MediaIngest/1.0 (+https://jano.manuelgodoy.eu)';
const uploadsRoot = join(process.cwd(), 'uploads');
const publicBase = resolveMediaPublicBaseUrl(process.env.MEDIA_PUBLIC_BASE_URL);
const allowedRights = new Set(['PUBLIC_DOMAIN', 'CC0', 'CC_BY', 'CC_BY_SA']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stripHtml = (value: string | undefined) =>
  (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

type Candidate = {
  pageUrl: string;
  originalUrl: string;
  downloadUrl: string;
  mime: string;
  width: number;
  height: number;
  license: string;
  rights: string;
  attribution: string | null;
  creator: string | null;
};
type Prepared = Candidate & {
  bytes: Buffer;
  sha256: string;
  master: { key: string; bytes: number; width: number; height: number; mime: string };
  card: { key: string; bytes: number; width: number; height: number };
  thumbnail: { key: string; bytes: number; width: number; height: number };
  files: Array<{ key: string; bytes: Buffer }>;
};

function rightsClass(license: string) {
  const value = license.toLowerCase();
  if (value.includes('public domain')) return 'PUBLIC_DOMAIN';
  if (value.includes('cc0')) return 'CC0';
  if (value.includes('cc by-sa')) return 'CC_BY_SA';
  if (value.includes('cc by')) return 'CC_BY';
  return 'UNKNOWN';
}

async function fetchWithRetry(url: string): Promise<Response> {
  let failure: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      let currentUrl = url;
      let response: Response | undefined;
      for (let redirect = 0; redirect <= 3; redirect += 1) {
        const parsed = new URL(currentUrl);
        if (
          parsed.protocol !== 'https:' ||
          !['commons.wikimedia.org', 'upload.wikimedia.org'].includes(parsed.hostname)
        ) {
          throw new Error(`Rejected redirect host ${parsed.hostname}`);
        }
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
          },
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirect === 3) throw new Error('Redirect limit exceeded');
        currentUrl = new URL(location, currentUrl).toString();
      }
      if (!response) throw new Error('No response');
      if (response.status !== 429 && response.status < 500) return response;
      const retryAfter = Number(response.headers.get('retry-after'));
      await response.body?.cancel();
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt,
      );
      failure = new Error(`HTTP ${response.status}`);
    } catch (error) {
      failure = error as Error;
      await sleep(800 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw failure ?? new Error('Download failed');
}

async function resolveCommons(fileTitle: string): Promise<Candidate> {
  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  endpoint.searchParams.set('action', 'query');
  endpoint.searchParams.set('format', 'json');
  endpoint.searchParams.set('titles', fileTitle);
  endpoint.searchParams.set('prop', 'imageinfo');
  endpoint.searchParams.set('iiprop', 'url|size|mime|extmetadata');
  endpoint.searchParams.set('iiurlwidth', '1920');
  const response = await fetchWithRetry(endpoint.toString());
  if (!response.ok) throw new Error(`Commons metadata HTTP ${response.status}`);
  const data = (await response.json()) as any;
  const page = Object.values(data.query?.pages ?? {})[0] as any;
  const info = page?.imageinfo?.[0];
  if (!info?.url || !info?.thumburl || !String(info.mime).startsWith('image/'))
    throw new Error(`No usable raster imageinfo: ${fileTitle}`);
  const license =
    stripHtml(info.extmetadata?.LicenseShortName?.value) ||
    stripHtml(info.extmetadata?.UsageTerms?.value);
  return {
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, '_'))}`,
    originalUrl: String(info.url).replace(/\?.*$/, ''),
    downloadUrl: String(info.thumburl).replace(/\?.*$/, ''),
    mime: info.mime,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    license,
    rights: rightsClass(license),
    attribution: stripHtml(info.extmetadata?.Attribution?.value) || null,
    creator: stripHtml(info.extmetadata?.Artist?.value) || null,
  };
}

async function limitedBytes(response: Response): Promise<Buffer> {
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (
    !contentType ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(contentType)
  )
    throw new Error(`Rejected content type ${contentType ?? 'missing'}`);
  const advertised = Number(response.headers.get('content-length'));
  if (Number.isFinite(advertised) && advertised > MAX_BYTES)
    throw new Error(`Download exceeds ${MAX_BYTES} bytes`);
  if (!response.body) throw new Error('Empty response body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error(`Download exceeds ${MAX_BYTES} bytes`);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!total) throw new Error('Empty response body');
  return Buffer.concat(chunks);
}

async function prepare(candidate: Candidate): Promise<Prepared> {
  const bytes = await limitedBytes(await fetchWithRetry(candidate.downloadUrl));
  const decoded = await sharp(bytes, { limitInputPixels: 80_000_000, animated: false }).metadata();
  if (
    !decoded.width ||
    !decoded.height ||
    !decoded.format ||
    !['jpeg', 'png', 'webp', 'avif'].includes(decoded.format)
  )
    throw new Error('Image decode/format validation failed');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const root = `media/ingested/${sha256.slice(0, 2)}/${sha256}`;
  const masterExt = decoded.format === 'jpeg' ? 'jpg' : decoded.format;
  const masterKey = `${root}/master.${masterExt}`;
  const cardBytes = await sharp(bytes, { limitInputPixels: 80_000_000, animated: false })
    .rotate()
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toBuffer();
  const thumbBytes = await sharp(bytes, { limitInputPixels: 80_000_000, animated: false })
    .rotate()
    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
  const cardMeta = await sharp(cardBytes).metadata();
  const thumbMeta = await sharp(thumbBytes).metadata();
  if (!cardMeta.width || !cardMeta.height || !thumbMeta.width || !thumbMeta.height)
    throw new Error('Derivative decode validation failed');
  return {
    ...candidate,
    bytes,
    sha256,
    master: {
      key: masterKey,
      bytes: bytes.length,
      width: decoded.width,
      height: decoded.height,
      mime: `image/${decoded.format === 'jpeg' ? 'jpeg' : decoded.format}`,
    },
    card: {
      key: `${root}/card-900.webp`,
      bytes: cardBytes.length,
      width: cardMeta.width,
      height: cardMeta.height,
    },
    thumbnail: {
      key: `${root}/thumbnail-400.webp`,
      bytes: thumbBytes.length,
      width: thumbMeta.width,
      height: thumbMeta.height,
    },
    files: [
      { key: masterKey, bytes },
      { key: `${root}/card-900.webp`, bytes: cardBytes },
      { key: `${root}/thumbnail-400.webp`, bytes: thumbBytes },
    ],
  };
}

async function persistFiles(prepared: Prepared) {
  const tmpRoot = join(uploadsRoot, '.ingest-tmp', prepared.sha256);
  const made: string[] = [];
  await rm(tmpRoot, { recursive: true, force: true });
  await mkdir(tmpRoot, { recursive: true });
  try {
    for (const file of prepared.files) {
      const finalPath = join(uploadsRoot, file.key);
      await mkdir(join(tmpRoot, basename(file.key)), { recursive: true });
      const staged = join(tmpRoot, basename(file.key), 'asset');
      await writeFile(staged, file.bytes, { flag: 'wx' });
      await mkdir(join(finalPath, '..'), { recursive: true });
      try {
        await stat(finalPath);
      } catch {
        await rename(staged, finalPath);
        made.push(finalPath);
      }
    }
    return made;
  } catch (error) {
    await Promise.all(made.map((file) => rm(file, { force: true })));
    throw error;
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const manifest: any[] = [];
  try {
    for (const item of foundationalV1VisualPilot) {
      const entity = await prisma.entity.findUnique({
        where: { slug: item.slug },
        include: { mediaLinks: { include: { media: true } } },
      });
      if (!entity) throw new Error(`Missing entity ${item.slug}`);
      const existingPrimary = entity.mediaLinks.find((link) => link.isPrimary);
      if (existingPrimary) {
        manifest.push({
          entitySlug: item.slug,
          status: 'KEEP',
          existingMedia: {
            id: existingPrimary.mediaId,
            displayUrl: existingPrimary.media.displayUrl ?? existingPrimary.media.url,
          },
        });
        continue;
      }
      await sleep(500);
      try {
        const candidate = await resolveCommons(item.fileTitle);
        if (!allowedRights.has(candidate.rights)) {
          manifest.push({ entitySlug: item.slug, status: 'REJECT_RIGHTS', candidate });
          continue;
        }
        const prepared = await prepare(candidate);
        const planned = {
          master: {
            storageKey: prepared.master.key,
            bytes: prepared.master.bytes,
            dimensions: [prepared.master.width, prepared.master.height],
            url: buildPublicUploadUrl(prepared.master.key, publicBase),
          },
          card: {
            storageKey: prepared.card.key,
            bytes: prepared.card.bytes,
            dimensions: [prepared.card.width, prepared.card.height],
          },
          thumbnail: {
            storageKey: prepared.thumbnail.key,
            bytes: prepared.thumbnail.bytes,
            dimensions: [prepared.thumbnail.width, prepared.thumbnail.height],
          },
        };
        const existing = await prisma.media.findFirst({
          where: {
            originType: MediaOriginType.INGESTED,
            canonicalUrl: prepared.originalUrl,
            storageKey: prepared.master.key,
          },
        });
        if (!apply) {
          manifest.push({
            entitySlug: item.slug,
            status: existing ? 'NO_ACTION_ALREADY_INGESTED' : 'READY_TO_INGEST',
            external: candidate,
            planned,
            existingMedia: null,
            replacement: false,
          });
          continue;
        }
        const createdFiles = await persistFiles(prepared);
        try {
          const master =
            existing ??
            (await prisma.$transaction(async (tx) => {
              const source = `Wikimedia Commons`;
              const attribution = candidate.attribution ?? candidate.creator ?? undefined;
              const createdMaster = await tx.media.create({
                data: {
                  url: buildPublicUploadUrl(prepared.master.key, publicBase),
                  displayUrl: buildPublicUploadUrl(prepared.master.key, publicBase),
                  canonicalUrl: prepared.originalUrl,
                  sourcePageUrl: candidate.pageUrl,
                  storageKey: prepared.master.key,
                  originalFilename: basename(new URL(candidate.originalUrl).pathname),
                  fileSize: prepared.master.bytes,
                  mimeType: prepared.master.mime,
                  width: prepared.master.width,
                  height: prepared.master.height,
                  provider: MediaProvider.WIKIMEDIA_COMMONS,
                  qualityTier: 'HIGH',
                  originType: MediaOriginType.INGESTED,
                  alt: item.alt,
                  source,
                  photoBy: attribution,
                  license: candidate.license,
                },
              });
              const card = await tx.media.create({
                data: {
                  url: buildPublicUploadUrl(prepared.card.key, publicBase),
                  displayUrl: buildPublicUploadUrl(prepared.card.key, publicBase),
                  canonicalUrl: prepared.originalUrl,
                  sourcePageUrl: candidate.pageUrl,
                  storageKey: prepared.card.key,
                  originalFilename: 'card-900.webp',
                  fileSize: prepared.card.bytes,
                  mimeType: 'image/webp',
                  width: prepared.card.width,
                  height: prepared.card.height,
                  provider: MediaProvider.WIKIMEDIA_COMMONS,
                  qualityTier: 'MEDIUM',
                  originType: MediaOriginType.INGESTED,
                  derivedFromMediaId: createdMaster.id,
                  alt: item.alt,
                  source,
                  photoBy: attribution,
                  license: candidate.license,
                },
              });
              const thumbnail = await tx.media.create({
                data: {
                  url: buildPublicUploadUrl(prepared.thumbnail.key, publicBase),
                  displayUrl: buildPublicUploadUrl(prepared.thumbnail.key, publicBase),
                  canonicalUrl: prepared.originalUrl,
                  sourcePageUrl: candidate.pageUrl,
                  storageKey: prepared.thumbnail.key,
                  originalFilename: 'thumbnail-400.webp',
                  fileSize: prepared.thumbnail.bytes,
                  mimeType: 'image/webp',
                  width: prepared.thumbnail.width,
                  height: prepared.thumbnail.height,
                  provider: MediaProvider.WIKIMEDIA_COMMONS,
                  qualityTier: 'LOW',
                  originType: MediaOriginType.INGESTED,
                  derivedFromMediaId: createdMaster.id,
                  alt: item.alt,
                  source,
                  photoBy: attribution,
                  license: candidate.license,
                },
              });
              await tx.entityMedia.createMany({
                data: [
                  {
                    entityId: entity.id,
                    mediaId: createdMaster.id,
                    role: MediaRole.HERO,
                    sortOrder: 0,
                    isPrimary: true,
                    displayMode: item.candidateKind === 'ARTWORK' ? 'CONTAIN' : 'COVER',
                  },
                  {
                    entityId: entity.id,
                    mediaId: card.id,
                    role: MediaRole.CARD,
                    sortOrder: 0,
                    isPrimary: false,
                    displayMode: 'COVER',
                  },
                  {
                    entityId: entity.id,
                    mediaId: thumbnail.id,
                    role: MediaRole.THUMBNAIL,
                    sortOrder: 0,
                    isPrimary: false,
                    displayMode: 'COVER',
                  },
                ],
              });
              return createdMaster;
            }));
          manifest.push({
            entitySlug: item.slug,
            status: existing ? 'NO_ACTION_ALREADY_INGESTED' : 'INGESTED',
            external: candidate,
            planned,
            masterMediaId: master.id,
            localUrl: master.displayUrl,
          });
        } catch (error) {
          await Promise.all(createdFiles.map((file) => rm(file, { force: true })));
          throw error;
        }
      } catch (error) {
        manifest.push({
          entitySlug: item.slug,
          status: 'DOWNLOAD_DEFERRED',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          maxDownloadBytes: MAX_BYTES,
          derivatives: ['master-native', 'card-900.webp', 'thumbnail-400.webp'],
          manifest,
          pendingChanges: manifest.filter((row) => row.status === 'READY_TO_INGEST').length,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
