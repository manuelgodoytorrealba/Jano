#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const maxBytes = 15 * 1024 * 1024;
const roles = ['HERO', 'CARD', 'DETAIL', 'THUMBNAIL', 'EXPLORER_3D', 'GALLERY'];
const mimeByExt = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const within = (root, target) => target === root || target.startsWith(root + path.sep);
const exists = (target) => { try { fs.lstatSync(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
function shape(value, allowed, label) {
  check(value && typeof value === 'object' && !Array.isArray(value), `Invalid ${label}`);
  for (const key of Object.keys(value)) check(allowed.includes(key), `Unexpected ${label} field: ${key}`);
}
function settings(args) {
  const options = { apply: false, file: path.join(__dirname, 'informalismo-media.json'), uploadsDir: path.join(process.cwd(), 'uploads') };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') options.apply = true;
    else if (args[i] === '--dry-run') options.dryRun = true;
    else if (['--file', '--uploads-dir'].includes(args[i])) { const key = args[i] === '--file' ? 'file' : 'uploadsDir'; check(text(args[i + 1]) && !args[i + 1].startsWith('--'), `Missing ${args[i]} value`); options[key] = path.resolve(args[++i]); }
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  check(!(options.apply && options.dryRun), 'Choose --apply or --dry-run, not both');
  return options;
}
function publicUrl(value) {
  if (value === null) return true;
  if (!text(value)) return false;
  const url = new URL(value);
  return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?)/i.test(url.hostname) && !url.hostname.endsWith('.local');
}
function validate(doc) {
  shape(doc, ['version', 'assets'], 'manifest'); check(doc.version === 1 && Array.isArray(doc.assets) && doc.assets.length > 0, 'Expected version 1 and nonempty assets');
  const keys = new Set(), hashes = new Set(), assignments = new Set(), primaries = new Map();
  for (const asset of doc.assets) {
    shape(asset, ['key', 'sha256', 'file', 'storageKey', 'mimeType', 'width', 'height', 'alt', 'source', 'photoBy', 'license', 'sourcePageUrl', 'canonicalUrl', 'assignments'], 'asset');
    check(text(asset.key) && !keys.has(asset.key) && /^[a-f0-9]{64}$/.test(asset.sha256) && !hashes.has(asset.sha256), `Invalid/duplicate asset key or SHA: ${asset.key}`); keys.add(asset.key); hashes.add(asset.sha256);
    const match = /^assets\/([a-f0-9]{64})\.(jpg|jpeg|png|webp)$/.exec(asset.file);
    check(match && match[1] === asset.sha256 && asset.storageKey === `media/informalismo-20261026/${match[1]}.${match[2]}` && mimeByExt[match[2]] === asset.mimeType, `Incompatible file, storage key or MIME: ${asset.key}`);
    check(Number.isInteger(asset.width) && asset.width > 0 && Number.isInteger(asset.height) && asset.height > 0 && asset.width * asset.height <= 100_000_000, `Invalid dimensions: ${asset.key}`);
    for (const key of ['alt', 'source']) check(text(asset[key]) && asset[key].length <= 240, `Missing/long ${key}: ${asset.key}`);
    for (const key of ['photoBy', 'license']) check(asset[key] === null || (text(asset[key]) && asset[key].length <= 240), `Invalid ${key}: ${asset.key}`);
    for (const credit of [asset.source, asset.photoBy, asset.license].filter(Boolean)) check(!/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(credit), `Private path/email in credit: ${asset.key}`);
    check(publicUrl(asset.sourcePageUrl) && publicUrl(asset.canonicalUrl), `Non-public source URL: ${asset.key}`);
    check(Array.isArray(asset.assignments) && asset.assignments.length > 0, `Missing assignments: ${asset.key}`);
    for (const item of asset.assignments) {
      shape(item, ['slug', 'role', 'isPrimary', 'sortOrder', 'displayMode'], 'assignment');
      check(text(item.slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) && roles.includes(item.role) && typeof item.isPrimary === 'boolean' && Number.isInteger(item.sortOrder) && item.sortOrder >= 0 && ['COVER', 'CONTAIN', null].includes(item.displayMode), `Invalid assignment: ${asset.key}`);
      const key = `${item.slug}:${asset.sha256}:${item.role}`; check(!assignments.has(key), `Duplicate assignment: ${key}`); assignments.add(key);
      if (item.isPrimary) { check(!primaries.has(item.slug) || primaries.get(item.slug) === asset.sha256, `Competing planned primaries: ${item.slug}`); primaries.set(item.slug, asset.sha256); }
    }
  }
  return doc;
}
function signature(bytes, mime) {
  if (mime === 'image/jpeg') return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.subarray(12, 16).toString() === 'IHDR';
  return mime === 'image/webp' && bytes.length >= 30 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length;
}
async function prepare(doc, packageDir, sharp) {
  const root = fs.realpathSync(packageDir), prepared = [];
  for (const asset of doc.assets) {
    const input = fs.realpathSync(path.resolve(root, asset.file)); check(within(root, input) && fs.statSync(input).isFile(), `Asset escapes package or is not a file: ${asset.key}`);
    const size = fs.statSync(input).size; check(size > 0 && size <= maxBytes, `Asset exceeds 15 MiB or is empty: ${asset.key}`);
    const bytes = fs.readFileSync(input); check(bytes.length <= maxBytes && digest(bytes) === asset.sha256 && signature(bytes, asset.mimeType), `SHA/signature mismatch: ${asset.key}`);
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 100_000_000 }), meta = await image.metadata();
    check(({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[meta.format] === asset.mimeType && meta.width === asset.width && meta.height === asset.height && (meta.pages ?? 1) === 1, `Format/dimension mismatch or animated file: ${asset.key}`);
    await image.stats(); prepared.push({ ...asset, bytes });
  }
  return prepared;
}
function destination(root, storageKey, create) {
  let current = root;
  for (const part of path.dirname(storageKey).split('/')) {
    current = path.join(current, part);
    if (!exists(current)) { if (!create) continue; fs.mkdirSync(current); }
    else check(!fs.lstatSync(current).isSymbolicLink() && fs.statSync(current).isDirectory() && within(root, fs.realpathSync(current)), `Unsafe uploads directory: ${current}`);
  }
  const target = path.join(root, storageKey);
  if (exists(target)) check(!fs.lstatSync(target).isSymbolicLink() && fs.statSync(target).isFile(), `Unsafe upload target: ${storageKey}`);
  return target;
}
function verifyExisting(target, asset) {
  if (!exists(target)) return false;
  check(!fs.lstatSync(target).isSymbolicLink() && fs.statSync(target).isFile(), `Unsafe existing upload: ${asset.storageKey}`);
  check(fs.statSync(target).size === asset.bytes.length && digest(fs.readFileSync(target)) === asset.sha256, `Existing upload differs; refusing overwrite: ${asset.storageKey}`); return true;
}
function install(root, asset, created) {
  const target = destination(root, asset.storageKey, true);
  if (verifyExisting(target, asset)) return false;
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    fs.writeFileSync(temporary, asset.bytes, { flag: 'wx', mode: 0o644 });
    // A completed temporary file becomes visible atomically without replacing a concurrent writer.
    try { fs.linkSync(temporary, target); const stat = fs.statSync(target); created.push({ target, sha256: asset.sha256, ino: stat.ino, dev: stat.dev }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; check(verifyExisting(target, asset), `Concurrent upload disappeared: ${asset.storageKey}`); return false; }
    return true;
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function cleanup(created) {
  for (const file of created.reverse()) {
    if (!fs.existsSync(file.target) || fs.lstatSync(file.target).isSymbolicLink()) continue;
    const stat = fs.statSync(file.target);
    if (stat.ino === file.ino && stat.dev === file.dev && digest(fs.readFileSync(file.target)) === file.sha256) fs.unlinkSync(file.target);
  }
}
async function transfer(client, assets, uploadsDir, apply) {
  const root = fs.realpathSync(uploadsDir); check(fs.statSync(root).isDirectory(), 'uploads-dir must be an existing directory');
  const created = [], stats = { mediaCreated: 0, mediaReused: 0, assignmentsCreated: 0, assignmentsUpdated: 0, filesCreated: 0, filesReused: 0, filesMissing: 0 };
  let commitAttempted = false;
  const one = async (sql, values, required = true) => { const result = await client.query(sql, values); check(result.rowCount <= 1 && (!required || result.rowCount === 1), `Missing or ambiguous media/entity: ${values?.join(', ')}`); return result.rows[0]; };
  for (const asset of assets) { if (verifyExisting(destination(root, asset.storageKey, false), asset)) stats.filesReused++; else stats.filesMissing++; }
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('informalismo-media-transfer-v1'))");
    for (const asset of assets) {
      const url = `/uploads/${asset.storageKey}`;
      const expected = { url, originType: 'UPLOAD', storageKey: asset.storageKey, mimeType: asset.mimeType, width: asset.width, height: asset.height, fileSize: asset.bytes.length, isVector: false, displayUrl: url, canonicalUrl: asset.canonicalUrl ?? url, sourcePageUrl: asset.sourcePageUrl, alt: asset.alt, source: asset.source, photoBy: asset.photoBy, license: asset.license };
      let media = await one('SELECT * FROM "Media" WHERE "storageKey"=$1 FOR UPDATE', [asset.storageKey], false);
      if (media) { check(Object.entries(expected).every(([key, value]) => media[key] === value), `Existing media metadata conflict: ${asset.key}`); stats.mediaReused++; }
      else { media = { id: randomUUID() }; await client.query('INSERT INTO "Media" (id,url,kind,"originType","storageKey","mimeType",width,height,"fileSize","isVector",provider,"qualityTier","displayUrl","canonicalUrl","sourcePageUrl",alt,source,"photoBy",license,"originalFilename","createdAt") VALUES ($1,$2,\'IMAGE\',\'UPLOAD\',$3,$4,$5,$6,$7,false,\'UNKNOWN\',\'MEDIUM\',$2,$8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP)', [media.id, url, asset.storageKey, asset.mimeType, asset.width, asset.height, asset.bytes.length, expected.canonicalUrl, asset.sourcePageUrl, asset.alt, asset.source, asset.photoBy, asset.license, path.basename(asset.file)]); stats.mediaCreated++; }
      for (const item of asset.assignments) {
        const entity = await one('SELECT id FROM "Entity" WHERE slug=$1 AND status=\'PUBLISHED\' FOR SHARE', [item.slug]);
        if (item.isPrimary) { const others = await client.query('SELECT id FROM "EntityMedia" WHERE "entityId"=$1 AND "isPrimary" AND "mediaId"<>$2 FOR UPDATE', [entity.id, media.id]); check(others.rowCount === 0, `Another primary already exists: ${item.slug}`); }
        const link = await one('SELECT * FROM "EntityMedia" WHERE "entityId"=$1 AND "mediaId"=$2 AND role=$3 FOR UPDATE', [entity.id, media.id, item.role], false);
        if (!link) { await client.query('INSERT INTO "EntityMedia" (id,"entityId","mediaId",role,"isPrimary","sortOrder","displayMode") VALUES ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), entity.id, media.id, item.role, item.isPrimary, item.sortOrder, item.displayMode]); stats.assignmentsCreated++; }
        else if (link.isPrimary !== item.isPrimary || link.sortOrder !== item.sortOrder || link.displayMode !== item.displayMode) { await client.query('UPDATE "EntityMedia" SET "isPrimary"=$1,"sortOrder"=$2,"displayMode"=$3 WHERE id=$4', [item.isPrimary, item.sortOrder, item.displayMode, link.id]); stats.assignmentsUpdated++; }
      }
    }
    if (apply) { for (const asset of assets) if (install(root, asset, created)) stats.filesCreated++; commitAttempted = true; await client.query('COMMIT'); }
    else await client.query('ROLLBACK');
    return stats;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { error.message += `; rollback: ${rollbackError.message}`; }
    if (!commitAttempted) cleanup(created);
    else error.message += '; COMMIT result may be uncertain: copied files retained to preserve any committed references';
    throw error;
  }
}
function selfTest() {
  assert.equal(settings([]).apply, false); assert.throws(() => settings(['--apply', '--dry-run'])); assert.throws(() => settings(['--uploads-dir'])); assert.throws(() => settings(['--force']));
  assert(!within('/package', '/package-escape/file')); assert(within('/package', '/package/assets/a.jpg'));
  assert(signature(Buffer.from([255, 216, 255, 0]), 'image/jpeg')); assert(!signature(Buffer.from('<svg/>'), 'image/png'));
  const hash = 'a'.repeat(64), asset = { key: 'test', sha256: hash, file: `assets/${hash}.jpg`, storageKey: `media/informalismo-20261026/${hash}.jpg`, mimeType: 'image/jpeg', width: 1, height: 1, alt: 'Pintura', source: 'Carpeta documental aportada', photoBy: null, license: null, sourcePageUrl: null, canonicalUrl: null, assignments: [{ slug: 'informalismo', role: 'HERO', isPrimary: false, sortOrder: 0, displayMode: 'CONTAIN' }] };
  assert(validate({ version: 1, assets: [asset] }));
  for (const mutate of [(a) => { a.file = '../private.jpg'; }, (a) => { a.mimeType = 'image/svg+xml'; }, (a) => { a.assignments[0].role = 'PRIMARY_LEGACY'; }, (a) => { a.source = '/Users/private/image.jpg'; }, (a) => { a.width = 0; }, (a) => { a.sourcePageUrl = 'http://localhost/private'; }]) { const bad = structuredClone(asset); mutate(bad); assert.throws(() => validate({ version: 1, assets: [bad] })); }
  console.log('Self-test passed: dry-run/CLI, path containment, raster signatures, valid manifest, traversal/SVG/legacy-role/private-credit/dimension/URL rejection.');
}
async function main() {
  if (process.argv.length === 3 && process.argv[2] === '--self-test') return selfTest();
  const options = settings(process.argv.slice(2)), doc = validate(JSON.parse(fs.readFileSync(options.file, 'utf8')));
  check(text(process.env.DATABASE_URL), 'DATABASE_URL is required');
  const sharp = require('sharp'), assets = await prepare(doc, path.dirname(options.file), sharp);
  const { Pool } = require('pg'), pool = new Pool({ connectionString: process.env.DATABASE_URL }); let client;
  try { client = await pool.connect(); console.log(`${options.apply ? 'APPLIED' : 'DRY RUN — rolled back'}: ${JSON.stringify(await transfer(client, assets, options.uploadsDir, options.apply))}`); }
  finally { client?.release(); await pool.end(); }
}
module.exports = { settings, validate, signature, prepare, destination, install, cleanup, transfer };
if (require.main === module) main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
