/* Targeted read-only browser checks for image-stage, mobile info and Explorer list mode. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const outputDir = process.argv[2];
const baseUrl = (process.argv[3] || 'https://jano.manuelgodoy.eu').replace(/\/$/, '');
if (!outputDir)
  throw new Error('Usage: node foundational-public-supplement-audit.cjs <output-dir>');
fs.mkdirSync(outputDir, { recursive: true });
const screenshotDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

function captureFailures(page, scope) {
  const failures = [];
  page.on('response', (response) => {
    if (
      response.status() >= 400 &&
      !(response.status() === 401 && response.url().includes('/auth/me'))
    ) {
      failures.push({
        scope,
        url: response.url(),
        status: response.status(),
        type: response.request().resourceType(),
      });
    }
  });
  page.on('requestfailed', (request) =>
    failures.push({
      scope,
      url: request.url(),
      status: null,
      type: request.resourceType(),
      error: request.failure()?.errorText,
    }),
  );
  return failures;
}

async function states(page, selector) {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const style = globalThis.getComputedStyle(node);
      return {
        src: node.getAttribute('src'),
        currentSrc: node.currentSrc,
        complete: node.complete,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
        width: rect.width,
        height: rect.height,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden',
      };
    }),
  );
}

async function mediaAudit(context, slug) {
  const page = await context.newPage();
  const failures = captureFailures(page, `media:${slug}`);
  await page.goto(`${baseUrl}/entity/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page
    .locator('.image-stage')
    .waitFor({ state: 'visible', timeout: 12000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  const images = await states(page, '.image-stage__img').catch(() => []);
  const backgrounds = await page.locator('.image-stage__backdrop').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        backgroundImage: globalThis.getComputedStyle(node).backgroundImage,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
  await page.screenshot({ path: path.join(screenshotDir, `media-${slug}.png`), fullPage: false });
  const pass = images.some(
    (image) =>
      image.complete &&
      image.naturalWidth > 0 &&
      image.naturalHeight > 0 &&
      image.width > 0 &&
      image.height > 0 &&
      image.visible,
  );
  await page.close();
  return { slug, pass, images, backgrounds, failures };
}

async function mobileAudit(context, slug) {
  const page = await context.newPage();
  const failures = captureFailures(page, `mobile:${slug}`);
  await page.goto(`${baseUrl}/entity/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  const defaultH1 = await page.locator('h1:visible').count();
  const infoButton = page.getByRole('button', { name: /Información|Info/i }).last();
  const infoButtonVisible = await infoButton.isVisible().catch(() => false);
  if (infoButtonVisible) {
    await infoButton.click();
    await page.waitForTimeout(500);
  }
  const h1Text = await page
    .locator('h1:visible')
    .first()
    .innerText()
    .catch(() => '');
  const summaryCount = await page
    .locator('.entity-story .entity-prose:visible')
    .count()
    .catch(() => 0);
  const relationCount = await page
    .locator('.relation-card__link:visible')
    .count()
    .catch(() => 0);
  const factCount = await page
    .locator('.entity-fact:visible, .entity-facts__item:visible')
    .count()
    .catch(() => 0);
  await page.screenshot({ path: path.join(screenshotDir, `mobile-${slug}.png`), fullPage: false });
  await page.close();
  return {
    slug,
    defaultH1Visible: defaultH1 > 0,
    infoButtonVisible,
    infoH1Visible: Boolean(h1Text.trim()),
    h1Text: h1Text.trim(),
    summaryVisible: summaryCount > 0,
    relationsVisible: relationCount > 0,
    relationCount,
    factCount,
    failures,
  };
}

async function catalogAudit(context, type) {
  const page = await context.newPage();
  const failures = captureFailures(page, `catalog-list:${type}`);
  await page.goto(`${baseUrl}/entities/${type}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const listButton = page.getByRole('tab', { name: /Lista|List/i });
  await listButton.click().catch(() => {});
  await page
    .locator('.entity-card')
    .first()
    .waitFor({ state: 'visible', timeout: 12000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  const cards = await page.locator('.entity-card:visible').count();
  const images = await states(page, '.entity-card app-jano-media img').catch(() => []);
  await page.screenshot({
    path: path.join(screenshotDir, `catalog-list-${type}.png`),
    fullPage: false,
  });
  await page.close();
  return {
    type,
    cards,
    imageCount: images.length,
    validImageCount: images.filter(
      (image) => image.complete && image.naturalWidth > 0 && image.visible,
    ).length,
    images,
    failures,
  };
}

async function editorialAudit(context, slug) {
  const page = await context.newPage();
  const failures = captureFailures(page, `editorial:${slug}`);
  const apiResponse = await page.request.get(`${baseUrl}/api/entities/${slug}?locale=es`);
  const entity = await apiResponse.json();
  await page.goto(`${baseUrl}/entity/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page
    .locator('h1')
    .first()
    .waitFor({ state: 'visible', timeout: 12000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  const publicText = (value) =>
    value
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:])/g, '$1');
  const body = publicText(await page.locator('body').innerText());
  const result = {
    slug,
    summaryExpected: Boolean(entity.summary),
    summaryVisible: entity.summary ? body.includes(publicText(entity.summary)) : false,
    essayExpected: Boolean(entity.content),
    essayVisible: entity.content ? body.includes(publicText(entity.content).slice(0, 40)) : false,
    failures,
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
    const media = [];
    for (const slug of ['saturno-devorando-a-su-hijo', 'maman', 'siglo-xix', 'siglo-xxi'])
      media.push(await mediaAudit(desktop, slug));
    const mobileResults = [];
    for (const slug of ['guernica', 'las-meninas', 'pablo-picasso', 'vincent-van-gogh', 'cuerpo'])
      mobileResults.push(await mobileAudit(mobile, slug));
    const catalogs = [];
    for (const type of ['artwork', 'artist', 'concept'])
      catalogs.push(await catalogAudit(desktop, type));
    const editorial = [];
    for (const slug of [
      'las-meninas',
      'saturno-devorando-a-su-hijo',
      'maman',
      'marcel-duchamp',
      'edward-hopper',
      'nighthawks',
    ])
      editorial.push(await editorialAudit(desktop, slug));
    const output = {
      generatedAt: new Date().toISOString(),
      mode: 'READ_ONLY_PUBLIC',
      baseUrl,
      media,
      mobile: mobileResults,
      catalogs,
      editorial,
    };
    fs.writeFileSync(
      path.join(outputDir, 'public-supplement-audit.json'),
      `${JSON.stringify(output, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
