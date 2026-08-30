/*
 * Read-only Playwright audit of the deployed public product.
 * Installs nothing and performs no authenticated or mutating requests.
 *
 * NODE_PATH=/tmp/jano-foundational-playwright/node_modules node \
 *   backend/api/scripts/foundational-public-render-audit.cjs \
 *   <snapshot.json> <output-dir> [base-url]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const [snapshotPath, outputDir, baseUrlArg] = process.argv.slice(2);
if (!snapshotPath || !outputDir) {
  throw new Error('Usage: node foundational-public-render-audit.cjs <snapshot.json> <output-dir>');
}

const baseUrl = (baseUrlArg || 'https://jano.manuelgodoy.eu').replace(/\/$/, '');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
fs.mkdirSync(outputDir, { recursive: true });
const screenshotDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const dbBySlug = new Map(snapshot.db.entities.map((entity) => [entity.slug, entity]));
const translationsByEntity = new Map();
for (const translation of snapshot.db.translations) {
  const rows = translationsByEntity.get(translation.entityId) || [];
  rows.push(translation);
  translationsByEntity.set(translation.entityId, rows);
}
const linksByEntity = new Map();
for (const link of snapshot.db.entityMedia) {
  const rows = linksByEntity.get(link.entityId) || [];
  rows.push(link);
  linksByEntity.set(link.entityId, rows);
}
const detailsByEntity = new Map();
for (const model of ['artwork', 'artist', 'concept', 'period']) {
  for (const detail of snapshot.db.details[model]) {
    detailsByEntity.set(detail.entityId, detail);
  }
}

function exactTranslation(entityId, locale) {
  return (translationsByEntity.get(entityId) || []).find(
    (translation) => translation.locale.toLowerCase() === locale,
  );
}
function normalized(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}
function sampleTierB(catalog) {
  const result = [];
  const byType = new Map();
  for (const entity of catalog.filter((item) => item.editorialTier === 'B')) {
    if (!dbBySlug.has(entity.slug)) continue;
    const rows = byType.get(entity.type) || [];
    rows.push(entity);
    byType.set(entity.type, rows);
  }
  const quotas = {
    ARTIST: 6,
    ARTWORK: 6,
    CONCEPT: 2,
    MOVEMENT: 2,
    ORGANIZATION: 1,
    PERIOD: 1,
    PLACE: 1,
    EVENT: 1,
  };
  for (const [type, quota] of Object.entries(quotas)) {
    result.push(...(byType.get(type) || []).slice(0, quota));
  }
  return result.slice(0, 20);
}

function attachNetworkCapture(page, entity) {
  const failures = [];
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      const request = response.request();
      failures.push({
        entity,
        url: response.url(),
        status,
        resourceType: request.resourceType(),
        failure: null,
      });
    }
  });
  page.on('requestfailed', (request) => {
    failures.push({
      entity,
      url: request.url(),
      status: null,
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || 'requestfailed',
    });
  });
  return failures;
}

async function imageStates(page, selector = 'img') {
  return page.locator(selector).evaluateAll((images) =>
    images.map((node) => {
      const image = node;
      const rect = image.getBoundingClientRect();
      const style = globalThis.getComputedStyle(image);
      return {
        alt: image.alt,
        src: image.getAttribute('src'),
        currentSrc: image.currentSrc,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width: rect.width,
        height: rect.height,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || 1) > 0,
      };
    }),
  );
}

async function auditEntity(context, catalogEntity, viewportName) {
  const page = await context.newPage();
  const failures = attachNetworkCapture(page, catalogEntity.slug);
  const url = `${baseUrl}/entity/${encodeURIComponent(catalogEntity.slug)}`;
  const startedAt = Date.now();
  let navigationStatus = null;
  let error = null;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    navigationStatus = response?.status() ?? null;
    await page
      .locator('h1')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => {});
    await page.waitForTimeout(1200);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const db = dbBySlug.get(catalogEntity.slug) || null;
  const es = db ? exactTranslation(db.id, 'es') : null;
  const detail = db ? detailsByEntity.get(db.id) || null : null;
  const bodyText = normalized(
    await page
      .locator('body')
      .innerText()
      .catch(() => ''),
  );
  const h1Text = normalized(
    await page
      .locator('h1')
      .first()
      .innerText()
      .catch(() => ''),
  );
  const images = await imageStates(page).catch(() => []);
  const mediaImages = await imageStates(page, 'app-jano-media img, .image-stage__img').catch(
    () => [],
  );
  const detailValues = detail
    ? Object.entries(detail)
        .filter(([key, value]) => key !== 'entityId' && value !== null && value !== '')
        .map(([key, value]) => ({
          key,
          value: String(value),
          visible: bodyText.includes(normalized(String(value))),
        }))
    : [];
  const expectedMedia = db ? (linksByEntity.get(db.id) || []).length : 0;
  const visibleMediaImages = mediaImages.filter(
    (image) =>
      image.complete &&
      image.naturalWidth > 0 &&
      image.naturalHeight > 0 &&
      image.width > 0 &&
      image.height > 0 &&
      image.visible,
  );
  const visibleSkeletons = await page
    .locator('.entity-explorer__skeleton:visible, [aria-busy="true"]:visible')
    .count()
    .catch(() => 0);
  const result = {
    entity: catalogEntity.slug,
    expectedTitle: catalogEntity.title,
    type: catalogEntity.type,
    tier: catalogEntity.editorialTier,
    viewport: viewportName,
    url,
    navigationStatus,
    durationMs: Date.now() - startedAt,
    dbExists: Boolean(db),
    published: db?.status === 'PUBLISHED',
    h1Visible: Boolean(h1Text),
    h1Text,
    titleCorrect: h1Text === normalized(es?.title || db?.title || catalogEntity.title),
    summaryExpected: Boolean(es?.shortDescription || es?.excerpt || db?.summary),
    summaryVisible:
      es?.shortDescription || es?.excerpt || db?.summary
        ? bodyText.includes(normalized(es?.shortDescription || es?.excerpt || db?.summary))
        : false,
    essayExpected: Boolean(es?.essay || db?.content),
    essayVisible:
      es?.essay || db?.content
        ? bodyText.includes(normalized(es?.essay || db?.content).slice(0, 80))
        : false,
    emptyEssayHeading: !es?.essay && !db?.content && /Ensayo|Essay/.test(bodyText),
    sourceExpected: db
      ? snapshot.db.sourceRefs.some((sourceRef) => sourceRef.entityId === db.id)
      : false,
    sourceVisible:
      (await page
        .locator('.relation-source:visible')
        .count()
        .catch(() => 0)) > 0,
    typedDetailsExpected: Boolean(detailValues.length),
    typedDetailValues: detailValues,
    typedDetailsVisible: detailValues.length > 0 && detailValues.every((item) => item.visible),
    expectedMedia,
    mediaImages,
    imageRenderPass: expectedMedia > 0 && visibleMediaImages.length > 0,
    relationsVisible:
      (await page
        .locator('.relation-card__link:visible')
        .count()
        .catch(() => 0)) > 0,
    relationLinkCount: await page
      .locator('.relation-card__link:visible')
      .count()
      .catch(() => 0),
    visibleSkeletons,
    loaderInfinite: visibleSkeletons > 0,
    pageErrorVisible: /Entity not found|Entidad no encontrada|No se pudo cargar|Not Found/.test(
      bodyText,
    ),
    bodyTextLength: bodyText.length,
    networkFailures: failures,
    images,
    error,
  };
  await page.close();
  return result;
}

async function runPool(context, entities, viewportName, concurrency = 4) {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < entities.length) {
      const index = cursor++;
      results[index] = await auditEntity(context, entities[index], viewportName);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function screenshots(context, slugs) {
  const results = [];
  for (const slug of slugs) {
    const page = await context.newPage();
    const failures = attachNetworkCapture(page, slug);
    let error = null;
    try {
      await page.goto(`${baseUrl}/entity/${encodeURIComponent(slug)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page
        .locator('h1')
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(screenshotDir, `${slug}.png`), fullPage: false });
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    results.push({ slug, error, networkFailures: failures });
    await page.close();
  }
  return results;
}

async function auditSearch(context, query) {
  const page = await context.newPage();
  const failures = attachNetworkCapture(page, `search:${query}`);
  await page.goto(`${baseUrl}/search?q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page
    .locator('.search-result')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(700);
  const resultCount = await page.locator('.search-result:visible').count();
  const titles = await page
    .locator('.search-result__body strong')
    .allInnerTexts()
    .catch(() => []);
  const images = await imageStates(page, '.search-result app-jano-media img').catch(() => []);
  const result = {
    query,
    resultCount,
    titles,
    expectedTitleVisible: titles.some((title) =>
      normalized(title).toLowerCase().includes(query.toLowerCase()),
    ),
    imageCount: images.length,
    validImageCount: images.filter(
      (image) =>
        image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && image.visible,
    ).length,
    images,
    networkFailures: failures,
  };
  await page.close();
  return result;
}

async function auditEntityCatalog(context, type) {
  const page = await context.newPage();
  const failures = attachNetworkCapture(page, `catalog:${type}`);
  await page.goto(`${baseUrl}/entities/${encodeURIComponent(type)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(1800);
  const links = await page
    .locator('a[href*="/entity/"]:visible')
    .count()
    .catch(() => 0);
  const images = await imageStates(page, 'app-jano-media img').catch(() => []);
  const result = {
    type,
    entityLinks: links,
    imageCount: images.length,
    validImageCount: images.filter(
      (image) =>
        image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && image.visible,
    ).length,
    images,
    networkFailures: failures,
  };
  await page.close();
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'es-ES',
    });
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      locale: 'es-ES',
    });
    const tierA = snapshot.catalog.entities.filter((entity) => entity.editorialTier === 'A');
    const tierB = sampleTierB(snapshot.catalog.entities);
    const mobileSlugs = ['guernica', 'las-meninas', 'pablo-picasso', 'vincent-van-gogh', 'cuerpo'];
    const mobileEntities = mobileSlugs
      .map((slug) => snapshot.catalog.entities.find((entity) => entity.slug === slug))
      .filter(Boolean);

    const tierAResults = await runPool(desktop, tierA, 'desktop', 4);
    const tierBResults = await runPool(desktop, tierB, 'desktop', 4);
    const mobileResults = await runPool(mobile, mobileEntities, 'mobile', 2);
    const screenshotResults = await screenshots(desktop, [
      'guernica',
      'las-meninas',
      'mona-lisa',
      'olympia',
      'gran-ola-de-kanagawa',
      'el-grito',
      'fuente',
      'pablo-picasso',
      'vincent-van-gogh',
      'frida-kahlo',
      'katsushika-hokusai',
      'cubismo',
      'cuerpo',
      'representacion',
      'paris',
      'museo-del-prado',
      'saturno-devorando-a-su-hijo',
      'siglo-xix',
    ]);
    const searchResults = [];
    for (const query of ['Guernica', 'Picasso', 'Nighthawks', 'Monet', 'Cubismo', 'Louvre']) {
      searchResults.push(await auditSearch(desktop, query));
    }
    const catalogResults = [];
    for (const type of ['artwork', 'artist', 'concept']) {
      catalogResults.push(await auditEntityCatalog(desktop, type));
    }

    const allEntityResults = [...tierAResults, ...tierBResults, ...mobileResults];
    const rawNetworkFailures = [
      ...allEntityResults.flatMap((result) => result.networkFailures),
      ...searchResults.flatMap((result) => result.networkFailures),
      ...catalogResults.flatMap((result) => result.networkFailures),
    ];
    const expectedAnonymousAuthProbes = rawNetworkFailures.filter(
      (failure) => failure.status === 401 && failure.url.includes('/api/auth/me'),
    );
    const networkFailures = rawNetworkFailures.filter(
      (failure) => !(failure.status === 401 && failure.url.includes('/api/auth/me')),
    );
    const output = {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_PUBLIC',
      baseUrl,
      tierA: tierAResults,
      tierBSample: tierBResults,
      mobileSample: mobileResults,
      screenshots: screenshotResults,
      search: searchResults,
      catalogs: catalogResults,
      networkFailures,
      expectedAnonymousAuthProbes,
      summary: {
        tierA: {
          tested: tierAResults.length,
          publicPagePass: tierAResults.filter(
            (result) => result.h1Visible && result.titleCorrect && !result.pageErrorVisible,
          ).length,
          titleVisible: tierAResults.filter((result) => result.h1Visible).length,
          summaryVisibleWhenExpected: tierAResults.filter(
            (result) => !result.summaryExpected || result.summaryVisible,
          ).length,
          sourceVisibleWhenExpected: tierAResults.filter(
            (result) => !result.sourceExpected || result.sourceVisible,
          ).length,
          typedDetailsVisibleWhenExpected: tierAResults.filter(
            (result) => !result.typedDetailsExpected || result.typedDetailsVisible,
          ).length,
          imageRenderPassWhenExpected: tierAResults.filter(
            (result) => result.expectedMedia === 0 || result.imageRenderPass,
          ).length,
          relationsVisible: tierAResults.filter((result) => result.relationsVisible).length,
          emptyEssayHeading: tierAResults.filter((result) => result.emptyEssayHeading).length,
          loaderInfinite: tierAResults.filter((result) => result.loaderInfinite).length,
          networkFailureEntities: new Set(
            tierAResults
              .filter((result) => result.networkFailures.length)
              .map((result) => result.entity),
          ).size,
        },
        tierBSample: {
          tested: tierBResults.length,
          publicPagePass: tierBResults.filter(
            (result) => result.h1Visible && result.titleCorrect && !result.pageErrorVisible,
          ).length,
          relationsVisible: tierBResults.filter((result) => result.relationsVisible).length,
          loaderInfinite: tierBResults.filter((result) => result.loaderInfinite).length,
        },
        mobile: {
          tested: mobileResults.length,
          publicPagePass: mobileResults.filter(
            (result) => result.h1Visible && result.titleCorrect && !result.pageErrorVisible,
          ).length,
          imageRenderPassWhenExpected: mobileResults.filter(
            (result) => result.expectedMedia === 0 || result.imageRenderPass,
          ).length,
        },
        failedNetworkRequests: networkFailures.length,
        failedImageRequests: networkFailures.filter((failure) => failure.resourceType === 'image')
          .length,
      },
    };
    fs.writeFileSync(
      path.join(outputDir, 'public-render-audit.json'),
      `${JSON.stringify(output, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(output.summary, null, 2)}\n`);
    await desktop.close();
    await mobile.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
