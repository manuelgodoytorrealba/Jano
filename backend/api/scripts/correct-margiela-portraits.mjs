import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

// Run after deploying the bundled portraits; the production deploy creates the recovery backup.
const apply = process.argv.includes('--apply');
const manifest =
  process.env.JANO_PORTRAIT_MANIFEST ??
  new URL('../../../frontend/public/assets/people/margiela/credits.json', import.meta.url);
const origin = process.env.JANO_PORTRAIT_ORIGIN ?? 'http://localhost:4200';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const portraits = JSON.parse(await readFile(manifest, 'utf8'));
  assert.equal(portraits.length, 10);
  assert.equal(new Set(portraits.map((item) => item.slug)).size, 10);
  for (const portrait of portraits) {
    assert.match(portrait.url, /^\/assets\/people\/margiela\/[a-z0-9-]+\.jpg$/);
    assert.ok(portrait.sourcePageUrl.startsWith('https://') && portrait.license);
    for (const [url, checksum] of [
      [portrait.url, portrait.sha256],
      [portrait.thumbnailUrl, portrait.thumbnailSha256],
    ]) {
      assert.match(url, /^\/assets\/people\/margiela\/(?:thumb\/)?[a-z0-9-]+\.jpg$/);
      const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(15000) });
      assert.ok(response.ok, `Portrait unavailable: ${portrait.slug} (${response.status})`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.readUInt16BE(0), 0xffd8, `Expected JPEG: ${portrait.slug}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), checksum, portrait.slug);
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const entities = (
      await client.query(
        'SELECT id, slug, kind FROM "Entity" WHERE slug = ANY($1::text[]) FOR UPDATE',
        [portraits.map((item) => item.slug)],
      )
    ).rows;
    assert.equal(entities.length, portraits.length, 'All ten canonical entities must exist');
    assert.ok(entities.every((entity) => entity.kind === 'PERSON'));
    const previous = (
      await client.query(
        'SELECT em.*, m.url FROM "EntityMedia" em JOIN "Media" m ON m.id = em."mediaId" WHERE em."entityId" = ANY($1::text[])',
        [entities.map((entity) => entity.id)],
      )
    ).rows;
    console.log(
      JSON.stringify(
        {
          apply,
          portraits: portraits.map(({ slug, name, url }) => ({ slug, name, url })),
          previous,
        },
        null,
        2,
      ),
    );
    if (!apply) {
      await client.query('ROLLBACK');
      return;
    }
    for (const portrait of portraits) {
      const entity = entities.find((item) => item.slug === portrait.slug);
      const mediaId = `margiela-portrait-${portrait.slug}`;
      const thumbnailId = `${mediaId}-thumbnail`;
      for (const variant of [
        { id: mediaId, url: portrait.url, width: portrait.width, height: portrait.height },
        {
          id: thumbnailId,
          url: portrait.thumbnailUrl,
          width: portrait.thumbnailWidth,
          height: portrait.thumbnailHeight,
        },
      ]) {
        await client.query(
          `INSERT INTO "Media" (id, url, "displayUrl", "canonicalUrl", "sourcePageUrl", alt, source, "photoBy", license, width, height, "mimeType", "focalX", "focalY")
         VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url, "displayUrl"=EXCLUDED."displayUrl", "canonicalUrl"=EXCLUDED."canonicalUrl", "sourcePageUrl"=EXCLUDED."sourcePageUrl", alt=EXCLUDED.alt, source=EXCLUDED.source, "photoBy"=EXCLUDED."photoBy", license=EXCLUDED.license, width=EXCLUDED.width, height=EXCLUDED.height, "mimeType"=EXCLUDED."mimeType", "focalX"=EXCLUDED."focalX", "focalY"=EXCLUDED."focalY"`,
          [
            variant.id,
            variant.url,
            portrait.imageUrl,
            portrait.sourcePageUrl,
            `Retrato de ${portrait.name}`,
            `${portrait.sourcePageUrl} · ${portrait.changes}`,
            portrait.photoBy,
            portrait.license,
            variant.width,
            variant.height,
            'image/jpeg',
            portrait.focalX,
            portrait.focalY,
          ],
        );
      }
      // Detach the person's old illustrations without changing media used by works or collections.
      await client.query('DELETE FROM "EntityMedia" WHERE "entityId"=$1', [entity.id]);
      for (const [role, id] of [
        ['HERO', mediaId],
        ['CARD', mediaId],
        ['THUMBNAIL', thumbnailId],
      ]) {
        await client.query(
          'INSERT INTO "EntityMedia" (id, "entityId", "mediaId", role, "isPrimary", "displayMode") VALUES ($1,$2,$3,$4,$5,$6)',
          [
            `margiela-portrait-link-${portrait.slug}-${role.toLowerCase()}`,
            entity.id,
            id,
            role,
            role === 'HERO',
            'CONTAIN',
          ],
        );
      }
    }
    const links = (
      await client.query(
        'SELECT em."entityId", em.role, m.url FROM "EntityMedia" em JOIN "Media" m ON m.id=em."mediaId" WHERE em."entityId"=ANY($1::text[])',
        [entities.map((entity) => entity.id)],
      )
    ).rows;
    assert.equal(links.length, portraits.length * 3);
    for (const portrait of portraits) {
      const entity = entities.find((item) => item.slug === portrait.slug);
      for (const [role, url] of [
        ['HERO', portrait.url],
        ['CARD', portrait.url],
        ['THUMBNAIL', portrait.thumbnailUrl],
      ]) {
        assert.ok(
          links.some(
            (link) => link.entityId === entity.id && link.role === role && link.url === url,
          ),
        );
      }
    }
    await client.query('COMMIT');
    console.log('Verified: ten people now use real portraits in every media slot.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
