import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  MediaOriginType,
  MediaProvider,
  MediaQualityTier,
  MediaRole,
  PrismaClient,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../src/common/media-url.util';

const apply = process.argv.includes('--apply');
const uploadsRoot = join(process.cwd(), 'uploads');
const publicBase = resolveMediaPublicBaseUrl(process.env.MEDIA_PUBLIC_BASE_URL);
const userAgent = 'JANO-MediaIngest/1.0 (+https://jano.manuelgodoy.eu)';

type Source = {
  slug: string;
  alt: string;
  pageUrl: string;
  url?: string;
  commonsFile?: string;
  provider: MediaProvider;
  license: string;
};

const sources: Source[] = [
  {
    slug: '_wave002-2534f70b1aff5898',
    alt: 'Black Mountain College Museum + Arts Center',
    pageUrl: 'https://www.blackmountaincollege.org/',
    url: 'https://www.blackmountaincollege.org/wp-content/uploads/LogoBlackMountainCollegeMuseumWeb2.png',
    provider: MediaProvider.MUSEUM,
    license: 'Courtesy Black Mountain College Museum + Arts Center',
  },
  {
    slug: '_wave002-c9738c77caaa7eef',
    alt: 'THINKING AHEAD: Progressive Design + Black Mountain College',
    pageUrl: 'https://www.blackmountaincollege.org/?p=10',
    url: 'https://www.blackmountaincollege.org/wp-content/uploads/SidebarJoin3.jpg',
    provider: MediaProvider.MUSEUM,
    license: 'Courtesy Black Mountain College Museum + Arts Center',
  },
  {
    slug: '_wave002-fa8862ede5a584e2',
    alt: 'The Quick and the Dead, Walker Art Center',
    pageUrl: 'https://www.walkerart.org/whats-on/the-quick-and-the-dead/',
    url: 'https://walker-web.imgix.net/cms/12367600.jpg?fm=jpg&w=1800&h=1800&fit=fit',
    provider: MediaProvider.MUSEUM,
    license: 'Courtesy Walker Art Center',
  },
  {
    slug: '_wave002-88e68a350ae62f81',
    alt: 'The Last Picture Show: Artists Using Photography, 1960–1982',
    pageUrl: 'https://www.walkerart.org/whats-on/the-last-picture-show-artists-using-photography/',
    url: 'https://walker-web.imgix.net/cms/840600.jpg?fm=jpg&w=1800&h=1800&fit=fit',
    provider: MediaProvider.MUSEUM,
    license: 'Courtesy Walker Art Center',
  },
  {
    slug: '_wave002-87a4c47fed1aba8f',
    alt: 'Revolución de julio de 1830',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg',
    commonsFile: 'File:Eugène Delacroix - La liberté guidant le peuple.jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Public domain',
  },
  {
    slug: '_wave002-397bedf198c65b9d',
    alt: 'Judith Baca',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Judith_Baca.jpg',
    commonsFile: 'File:Judith Baca.jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'CC BY 4.0',
  },
  {
    slug: '_wave002-807694c624b3ebf6',
    alt: 'Mario García Torres',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Mario_garcia_torres-_por_obvias_razones.jpg',
    commonsFile: 'File:Mario garcia torres- por obvias razones.jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Wikimedia Commons license',
  },
  {
    slug: '_wave002-499508459a2cf989',
    alt: 'Jim Hodges',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Portrait_of_Jim_Hodges.jpg',
    commonsFile: 'File:Portrait of Jim Hodges.jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Wikimedia Commons license',
  },
  {
    slug: '_wave002-02ab0af431ef65b2',
    alt: 'John Cage',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:John_Cage_(1988).jpg',
    commonsFile: 'File:John Cage (1988).jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Wikimedia Commons license',
  },
  {
    slug: '_wave002-2bb9a92d7a020f5b',
    alt: 'Lucy Lippard',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Lucy_Lippard,_Getty_Furst,_Edie_Williamson_-_DPLA_-_17b7945f3de60490fd10eb061eaeb459.jpg',
    commonsFile: 'File:Lucy Lippard, Getty Furst, Edie Williamson - DPLA - 17b7945f3de60490fd10eb061eaeb459.jpg',
    provider: MediaProvider.WIKIMEDIA_COMMONS,
    license: 'Wikimedia Commons license',
  },
  {
    slug: '_wave002-9e02455aa003ca73',
    alt: 'Six Years by Lucy Lippard',
    pageUrl: 'https://www.walkerart.org/reader/lucy-lippard-six-years-7500-walker-art-center/',
    url: 'https://blogs.walkerart.org/visualarts/files/2012/11/bg1972_vp_003b-copy.jpg',
    provider: MediaProvider.MUSEUM,
    license: 'Courtesy Walker Art Center',
  },
];

async function commons(file: string) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', format: 'json', titles: file, prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata', iiurlwidth: '1800',
  }).toString();
  const response = await fetch(api, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`Commons metadata failed: ${response.status}`);
  const json = (await response.json()) as any;
  const info = Object.values(json.query?.pages ?? {})[0] as any;
  const image = info?.imageinfo?.[0];
  if (!image?.thumburl || !String(image.mime).startsWith('image/')) throw new Error(`No image for ${file}`);
  return { url: String(image.thumburl).replace(/\?.*$/, ''), pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(info.title).replace(/ /g, '_'))}` };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const source of sources) {
      const entity = await prisma.entity.findUnique({ where: { slug: source.slug }, include: { mediaLinks: true } });
      if (!entity) throw new Error(`Missing entity ${source.slug}`);
      if (entity.mediaLinks.length) { console.log(`KEEP ${source.slug}`); continue; }
      const resolved = source.commonsFile ? await commons(source.commonsFile) : { url: source.url!, pageUrl: source.pageUrl };
      const response = await fetch(resolved.url, { headers: { 'User-Agent': userAgent } });
      if (!response.ok) throw new Error(`${source.slug}: image HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const image = sharp(bytes, { limitInputPixels: 80_000_000 });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || !metadata.format) throw new Error(`${source.slug}: invalid image`);
      const hash = createHash('sha256').update(bytes).digest('hex');
      const root = `media/ingested/wave002/${hash.slice(0, 2)}/${hash}`;
      const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
      const key = `${root}/master.${ext}`;
      console.log(`${apply ? 'IMPORT' : 'PLAN'} ${source.slug} ${key}`);
      if (!apply) continue;
      const path = join(uploadsRoot, key);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, bytes, { flag: 'wx' }).catch((error: any) => { if (error.code !== 'EEXIST') throw error; });
      await prisma.$transaction(async (tx) => {
        const media = await tx.media.create({ data: {
          url: buildPublicUploadUrl(key, publicBase), displayUrl: buildPublicUploadUrl(key, publicBase),
          canonicalUrl: resolved.url, sourcePageUrl: resolved.pageUrl, storageKey: key,
          originalFilename: `${source.slug}.${ext}`, fileSize: bytes.length,
          mimeType: `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`,
          width: metadata.width, height: metadata.height, provider: source.provider,
          qualityTier: MediaQualityTier.HIGH, originType: MediaOriginType.INGESTED,
          alt: source.alt, source: resolved.pageUrl, license: source.license,
        } });
        await tx.entityMedia.create({ data: {
          entityId: entity.id, mediaId: media.id, role: MediaRole.CARD, sortOrder: 0,
          isPrimary: true, displayMode: 'COVER',
        } });
      });
    }
  } finally { await prisma.$disconnect(); await pool.end(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
