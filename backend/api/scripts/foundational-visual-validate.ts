import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { tierA } from '../prisma/foundational/editorial-priority';

type HealthStatus = 'PASS' | 'BROKEN' | 'RIGHTS_REVIEW' | 'MISSING';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const minDimension = 480;

async function inspectUrl(url: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      // GET is intentional: several image providers treat HEAD differently.
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
      });
      const result = {
        status: response.status,
        finalUrl: response.url,
        contentType: response.headers.get('content-type'),
        contentLength: Number(response.headers.get('content-length')) || null,
        ok:
          response.ok &&
          (response.headers.get('content-type') ?? '').toLowerCase().startsWith('image/'),
      };
      if (attempt < 2 && [429, 500, 502, 503, 504].includes(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      return result;
    } catch (error) {
      if (attempt === 2) {
        return {
          status: null,
          finalUrl: null,
          contentType: null,
          contentLength: null,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    status: null,
    finalUrl: null,
    contentType: null,
    contentLength: null,
    ok: false,
    error: 'probe failed',
  };
}

async function main() {
  const entities = await prisma.entity.findMany({
    where: { slug: { in: [...tierA] } },
    select: {
      slug: true,
      title: true,
      type: true,
      mediaLinks: {
        include: { media: true },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      },
    },
    orderBy: { slug: 'asc' },
  });

  const results = [] as Array<Record<string, unknown>>;
  for (const entity of entities) {
    const link = entity.mediaLinks[0];
    if (!link) {
      results.push({
        slug: entity.slug,
        title: entity.title,
        type: entity.type,
        status: 'MISSING' satisfies HealthStatus,
      });
      continue;
    }

    const url = link.media.displayUrl || link.media.url;
    const http = await inspectUrl(url);
    const dimensions = { width: link.media.width, height: link.media.height };
    const tooSmall =
      !!dimensions.width &&
      !!dimensions.height &&
      Math.max(dimensions.width, dimensions.height) < minDimension;
    const status: HealthStatus = !http.ok
      ? 'BROKEN'
      : !link.media.license
        ? 'RIGHTS_REVIEW'
        : 'PASS';
    results.push({
      slug: entity.slug,
      title: entity.title,
      type: entity.type,
      status,
      provider: link.media.provider,
      role: link.role,
      url,
      sourcePageUrl: link.media.sourcePageUrl,
      license: link.media.license,
      dimensions,
      tooSmall,
      http,
    });
  }

  console.log(
    JSON.stringify(
      {
        total: results.length,
        minDimension,
        counts: Object.fromEntries(
          (['PASS', 'BROKEN', 'RIGHTS_REVIEW', 'MISSING'] as HealthStatus[]).map((status) => [
            status,
            results.filter((result) => result.status === status).length,
          ]),
        ),
        results,
      },
      null,
      2,
    ),
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
