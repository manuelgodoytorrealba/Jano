import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { foundationalV1VisualPilot } from '../prisma/editorial/foundational-v1-visual-pilot';

type CommonsInfo = {
  pageUrl: string;
  canonicalUrl: string;
  displayUrl: string;
  width: number;
  height: number;
  mime: string;
  license: string;
  attribution: string | null;
  creator: string | null;
  rights: string;
};
type ManifestRow = Record<string, unknown>;
const allowed = new Set(['--dry-run', '--apply']);
const args = process.argv.slice(2);
if (args.some((arg) => !allowed.has(arg)) || args.length > 1)
  throw new Error(
    'Usage: import-foundational-visual-pilot.ts [--dry-run|--apply]. Default is dry-run.',
  );
const apply = args[0] === '--apply';
const cacheDir = join(process.cwd(), '.cache', 'visual-pilot');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const stripHtml = (value: string | undefined) =>
  (value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function cachedJson(key: string, url: string): Promise<any> {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, `${key}.json`);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* cache miss */
  }
  let last: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'JANO-VisualPilot/1.0 (+https://jano.manuelgodoy.eu)' },
      });
      if (response.status === 429 || response.status >= 500)
        throw new Error(`Commons API HTTP ${response.status}`);
      if (!response.ok) throw new Error(`Commons API HTTP ${response.status}`);
      const json = await response.json();
      await writeFile(file, JSON.stringify(json));
      return json;
    } catch (error) {
      last = error as Error;
      await sleep(600 * 2 ** attempt);
    }
  }
  throw last;
}

function rightsClass(license: string): string {
  const normalized = license.toLowerCase();
  if (normalized.includes('public domain')) return 'PUBLIC_DOMAIN';
  if (normalized.includes('cc0')) return 'CC0';
  if (normalized.includes('cc by-sa')) return 'CC_BY_SA';
  if (normalized.includes('cc by')) return 'CC_BY';
  return 'UNKNOWN';
}

async function commons(fileTitle: string): Promise<CommonsInfo> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('titles', fileTitle);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|mime|extmetadata');
  url.searchParams.set('iiurlwidth', '1920');
  const data = await cachedJson(Buffer.from(fileTitle).toString('base64url'), url.toString());
  const page = Object.values(data.query?.pages ?? {})[0] as any;
  const info = page?.imageinfo?.[0];
  if (!info?.url || !info?.thumburl || !info?.mime?.startsWith('image/'))
    throw new Error(`No raster imageinfo for ${fileTitle}`);
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value) || stripHtml(meta.UsageTerms?.value);
  const attribution = stripHtml(meta.Attribution?.value) || null;
  const creator = stripHtml(meta.Artist?.value) || null;
  return {
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    canonicalUrl: info.url.replace(/\?.*$/, ''),
    displayUrl: info.thumburl.replace(/\?.*$/, ''),
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    mime: info.mime,
    license,
    attribution,
    creator,
    rights: rightsClass(license),
  };
}

async function validateImage(url: string) {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'JANO-VisualPilot/1.0 (+https://jano.manuelgodoy.eu)' },
  });
  return {
    http: response.status,
    contentType: response.headers.get('content-type'),
    contentLength: response.headers.get('content-length'),
    latencyMs: Date.now() - started,
    finalUrl: response.url,
    valid:
      response.status === 200 && (response.headers.get('content-type') ?? '').startsWith('image/'),
  };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const manifest: ManifestRow[] = [];
  try {
    for (const item of foundationalV1VisualPilot) {
      const entity = await prisma.entity.findUnique({
        where: { slug: item.slug },
        include: { mediaLinks: { include: { media: true } } },
      });
      if (!entity) {
        manifest.push({
          entitySlug: item.slug,
          candidate: item.fileTitle,
          action: 'SKIP_MISSING_ENTITY',
          before: null,
          after: null,
        });
        continue;
      }
      const primary = entity.mediaLinks.find((link) => link.isPrimary);
      if (primary) {
        manifest.push({
          entitySlug: item.slug,
          candidate: item.fileTitle,
          action: 'SKIP_EXISTING_PRIMARY',
          before: { mediaId: primary.mediaId, url: primary.media.displayUrl ?? primary.media.url },
          after: null,
        });
        continue;
      }
      await sleep(350);
      const candidate = await commons(item.fileTitle);
      const http = await validateImage(candidate.displayUrl);
      const action =
        candidate.rights === 'UNKNOWN'
          ? 'REJECT_UNKNOWN_RIGHTS'
          : !http.valid
            ? 'REJECT_HTTP'
            : apply
              ? 'CREATE_PRIMARY'
              : 'PENDING_CREATE_PRIMARY';
      const row: ManifestRow = {
        entitySlug: item.slug,
        candidate: item.fileTitle,
        provider: 'WIKIMEDIA_COMMONS',
        sourcePage: candidate.pageUrl,
        displayUrl: candidate.displayUrl,
        canonicalUrl: candidate.canonicalUrl,
        license: candidate.license,
        rightsStatus: candidate.rights,
        attribution: candidate.attribution,
        creator: candidate.creator,
        width: candidate.width,
        height: candidate.height,
        http,
        before: null,
        after:
          action === 'CREATE_PRIMARY'
            ? {
                role: 'HERO',
                primary: true,
                displayMode: item.candidateKind === 'ARTWORK' ? 'CONTAIN' : 'COVER',
              }
            : null,
        action,
      };
      if (action === 'CREATE_PRIMARY') {
        const media = await prisma.media.create({
          data: {
            url: candidate.canonicalUrl,
            canonicalUrl: candidate.canonicalUrl,
            displayUrl: candidate.displayUrl,
            sourcePageUrl: candidate.pageUrl,
            mimeType: candidate.mime,
            width: candidate.width,
            height: candidate.height,
            provider: 'WIKIMEDIA_COMMONS',
            qualityTier: 'HIGH',
            alt: item.alt,
            source: 'Wikimedia Commons',
            photoBy: candidate.attribution ?? candidate.creator ?? undefined,
            license: candidate.license,
          },
        });
        await prisma.entityMedia.create({
          data: {
            entityId: entity.id,
            mediaId: media.id,
            role: 'HERO',
            sortOrder: 0,
            isPrimary: true,
            displayMode: item.candidateKind === 'ARTWORK' ? 'CONTAIN' : 'COVER',
          },
        });
        row.after = { mediaId: media.id, role: 'HERO', primary: true };
      }
      manifest.push(row);
    }
    const pendingChanges = manifest.filter((row) => row.action === 'PENDING_CREATE_PRIMARY').length;
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          entries: foundationalV1VisualPilot.length,
          pendingChanges,
          manifest,
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
