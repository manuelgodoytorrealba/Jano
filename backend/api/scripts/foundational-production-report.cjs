/* Build reproducible CSV/JSON reports from a read-only production snapshot. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const [snapshotPath, outputDir, httpAuditPath, publicSupplementPath] = process.argv.slice(2);
if (!snapshotPath || !outputDir) {
  throw new Error(
    'Usage: node foundational-production-report.cjs <snapshot.json> <output-dir> [media-http.json]',
  );
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const httpAudit = httpAuditPath ? JSON.parse(fs.readFileSync(httpAuditPath, 'utf8')) : null;
const publicSupplement = publicSupplementPath
  ? JSON.parse(fs.readFileSync(publicSupplementPath, 'utf8'))
  : null;
fs.mkdirSync(outputDir, { recursive: true });

const nonBlank = (value) => typeof value === 'string' && value.trim().length > 0;
const present = (value) => value !== null && value !== undefined && value !== '';
const groupBy = (items, key) => {
  const result = new Map();
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : item[key];
    const values = result.get(value) || [];
    values.push(item);
    result.set(value, values);
  }
  return result;
};
const countBy = (items, key) =>
  Object.fromEntries(
    [...groupBy(items, key).entries()]
      .map(([value, rows]) => [value === null ? 'NULL' : String(value), rows.length])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
const csvCell = (value) => {
  if (Array.isArray(value)) value = value.join('|');
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
function writeCsv(filename, rows) {
  if (!rows.length) {
    fs.writeFileSync(path.join(outputDir, filename), '');
    return;
  }
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const body = [
    columns.join(','),
    ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(',')),
  ];
  fs.writeFileSync(path.join(outputDir, filename), `${body.join('\n')}\n`);
}
function writeJson(filename, value) {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

const catalogBySlug = new Map(snapshot.catalog.entities.map((entity) => [entity.slug, entity]));
const dbBySlug = new Map(snapshot.db.entities.map((entity) => [entity.slug, entity]));
const translationsByEntity = groupBy(snapshot.db.translations, 'entityId');
const aliasesByEntity = groupBy(snapshot.db.aliases, 'entityId');
const sourcesByEntity = groupBy(snapshot.db.sourceRefs, 'entityId');
const citationsByEntity = groupBy(
  snapshot.db.citations.filter((citation) => citation.entityId),
  'entityId',
);
const attributesByEntity = groupBy(snapshot.db.attributes, 'entityId');
const relationsByEntity = new Map(snapshot.db.entities.map((entity) => [entity.id, []]));
for (const relation of snapshot.db.relations) {
  relationsByEntity.get(relation.fromId)?.push(relation);
  relationsByEntity.get(relation.toId)?.push(relation);
}
const mediaById = new Map(snapshot.db.media.map((media) => [media.id, media]));
const mediaLinksByEntity = groupBy(snapshot.db.entityMedia, 'entityId');
const httpByMediaEntity = new Map(
  (httpAudit?.results || []).flatMap((item) =>
    item.links?.length
      ? item.links.map((link) => [`${link.entity}|${item.mediaId}`, item])
      : [[`|${item.mediaId}`, item]],
  ),
);
const httpByMediaId = new Map((httpAudit?.results || []).map((item) => [item.mediaId, item]));
const browserMediaBySlug = new Map(
  (publicSupplement?.media || []).map((item) => [item.slug, item]),
);
const detailMaps = Object.fromEntries(
  ['artwork', 'artist', 'concept', 'period'].map((model) => [
    model,
    new Map(snapshot.db.details[model].map((detail) => [detail.entityId, detail])),
  ]),
);

function exactTranslation(translations, locale) {
  return translations.find((translation) => translation.locale.toLowerCase() === locale) || null;
}
function sourceDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}
function sourceQuality(source) {
  const domain = sourceDomain(source.url);
  const institutional = Boolean(
    domain &&
    /(museum|museo|moma|metmuseum|louvre|tate|prado|uffizi|si\.edu|nga\.gov|nationalgallery|getty|centrepompidou)/i.test(
      domain,
    ),
  );
  const scholarly =
    source.sourceType === 'BOOK' ||
    source.sourceType === 'PAPER' ||
    source.sourceType === 'CATALOG';
  const generic = Boolean(
    domain && /(wikipedia|britannica|encyclopedia|artsy|theartstory)/i.test(domain),
  );
  return { domain, institutional, scholarly, generic };
}
function rightsStatus(media) {
  const license = (media?.license || '').trim().toUpperCase().replaceAll('_', ' ');
  if (!license) return 'UNKNOWN';
  if (/PUBLIC DOMAIN|PUBLIC-DOMAIN|PDM/.test(license)) return 'PUBLIC_DOMAIN';
  if (/\bCC0\b/.test(license)) return 'CC0';
  if (/CC[- ]BY[- ]SA/.test(license)) return 'CC_BY_SA';
  if (/CC[- ]BY/.test(license)) return 'CC_BY';
  return 'RIGHTS_REVIEW';
}
function detailFields(entityId, type) {
  const model =
    type === 'ARTWORK'
      ? 'artwork'
      : type === 'ARTIST' || type === 'PERSON'
        ? 'artist'
        : type === 'CONCEPT' || type === 'MOVEMENT'
          ? 'concept'
          : type === 'PERIOD'
            ? 'period'
            : null;
  const legacy = model ? detailMaps[model].get(entityId) || null : null;
  const attributes = (attributesByEntity.get(entityId) || []).filter(
    (attribute) =>
      attribute.status === 'PUBLISHED' &&
      [
        attribute.valueText,
        attribute.valueNumber,
        attribute.valueBoolean,
        attribute.valueDate,
        attribute.valueYear,
        attribute.valueJson,
      ].some(present),
  );
  const legacyFields = legacy
    ? Object.entries(legacy)
        .filter(([key, value]) => key !== 'entityId' && present(value))
        .map(([key]) => key)
    : [];
  return {
    model,
    hasLegacy: Boolean(legacy),
    legacyFields,
    attributeFields: [...new Set(attributes.map((attribute) => attribute.key))],
    attributes,
    hasAny: legacyFields.length > 0 || attributes.length > 0,
  };
}
function attributeValue(details, key) {
  const attribute = details.attributes.find((item) => item.key === key);
  if (!attribute) return null;
  return (
    attribute.valueText ??
    attribute.valueNumber ??
    attribute.valueBoolean ??
    attribute.valueDate ??
    attribute.valueYear ??
    attribute.valueJson ??
    null
  );
}
function shouldHaveImage(type, tier) {
  return (
    ((type === 'ARTWORK' || type === 'ARTIST' || type === 'PERSON') && tier !== 'C') ||
    ((type === 'PLACE' || type === 'ORGANIZATION') && tier === 'A')
  );
}
function imagePriority(type, tier) {
  if (type === 'ARTWORK' && tier === 'A') return 'V0';
  if ((type === 'ARTIST' || type === 'PERSON') && tier === 'A') return 'V1';
  if ((type === 'PLACE' || type === 'ORGANIZATION') && tier === 'A') return 'V2';
  if ((type === 'ARTWORK' || type === 'ARTIST' || type === 'PERSON') && tier === 'B') return 'V3';
  if (['CONCEPT', 'MOVEMENT', 'PERIOD'].includes(type)) return 'V4';
  return null;
}
function coreFactProblems(row, db, details, relations) {
  const problems = [];
  const type = row.type;
  const relationTypes = new Set(relations.map((relation) => relation.type));
  const legacy = details.model ? detailMaps[details.model].get(db.id) || {} : {};
  const hasDate = present(db.startYear) || present(db.endYear);

  if (type === 'ARTWORK') {
    if (!hasDate) problems.push('missing_date');
    if (!relationTypes.has('CREATED_BY')) problems.push('missing_creator_relation');
    if (!details.hasAny) problems.push('missing_typed_facts');
  } else if (type === 'ARTIST' || type === 'PERSON') {
    const birth = legacy.birthYear ?? attributeValue(details, 'artist_birth_year') ?? db.startYear;
    const death = legacy.deathYear ?? attributeValue(details, 'artist_death_year') ?? db.endYear;
    if (!present(birth) && !present(death)) problems.push('missing_life_dates');
    if (!details.hasAny) problems.push('missing_typed_facts');
  } else if (type === 'MOVEMENT') {
    if (!hasDate) problems.push('missing_chronology');
  } else if (type === 'PERIOD') {
    if (!hasDate) problems.push('missing_chronology');
    if (!details.hasAny) problems.push('missing_definition');
  } else if (type === 'CONCEPT') {
    if (!details.hasAny && !row.summaryEs && !row.summaryEn) problems.push('missing_definition');
  } else if (type === 'EVENT') {
    if (!hasDate) problems.push('missing_date');
  }
  return problems;
}

const inventory = snapshot.catalog.entities.map((catalog) => {
  const db = dbBySlug.get(catalog.slug) || null;
  if (!db) {
    const missingCategories = ['MISSING_ENTITY', 'NEEDS_IDENTITY', 'NEEDS_FACTS'];
    if (catalog.editorialTier === 'A' || catalog.editorialTier === 'B') {
      missingCategories.push('NEEDS_EDITORIAL', 'NEEDS_SOURCE');
    }
    if (shouldHaveImage(catalog.type, catalog.editorialTier)) missingCategories.push('NEEDS_IMAGE');
    return {
      slug: catalog.slug,
      name: catalog.title,
      class: null,
      type: catalog.type,
      tier: catalog.editorialTier,
      dbExists: false,
      status: 'MISSING_FROM_DB',
      canonicalTitle: false,
      titleEs: false,
      titleEn: false,
      aliasCount: 0,
      hasDates: false,
      summaryEs: false,
      summaryEn: false,
      essayEs: false,
      essayEn: false,
      sourceCount: 0,
      typedDetails: false,
      mediaCount: 0,
      imageHttpValid: false,
      relations: 0,
      semanticRelations: 0,
      structuralRelations: 0,
      publicPage: 'MISSING',
      completenessCategory: missingCategories,
      problems: ['missing_from_db'],
      imagePriority: shouldHaveImage(catalog.type, catalog.editorialTier)
        ? imagePriority(catalog.type, catalog.editorialTier)
        : null,
    };
  }

  const translations = translationsByEntity.get(db.id) || [];
  const es = exactTranslation(translations, 'es');
  const en = exactTranslation(translations, 'en');
  const aliases = aliasesByEntity.get(db.id) || [];
  const sources = sourcesByEntity.get(db.id) || [];
  const directCitations = citationsByEntity.get(db.id) || [];
  const details = detailFields(db.id, db.type);
  const relations = relationsByEntity.get(db.id) || [];
  const structuralRelations = relations.filter((relation) =>
    ['taxonomy', 'structure'].includes((relation.category || '').toLowerCase()),
  );
  const semanticRelations = relations.filter(
    (relation) => !['taxonomy', 'structure'].includes((relation.category || '').toLowerCase()),
  );
  const links = mediaLinksByEntity.get(db.id) || [];
  const linkedMedia = links.map((link) => ({
    ...link,
    media: mediaById.get(link.mediaId) || null,
    http:
      httpByMediaEntity.get(`${db.slug}|${link.mediaId}`) ||
      httpByMediaId.get(link.mediaId) ||
      null,
  }));
  const primary =
    linkedMedia.find((link) => link.isPrimary) ||
    linkedMedia.find((link) => ['HERO', 'PRIMARY_LEGACY'].includes(link.role)) ||
    linkedMedia[0] ||
    null;
  const imageHttpValid = linkedMedia.some((link) => link.http?.result === 'HTTP_VALID');
  const hasHttpAudit = linkedMedia.some((link) => link.http);
  const browserMedia = browserMediaBySlug.get(db.slug) || null;
  const summaries = {
    es: es?.shortDescription || es?.excerpt || db.summary || null,
    en: en?.shortDescription || en?.excerpt || db.summary || null,
  };
  const essays = { es: es?.essay || db.content || null, en: en?.essay || db.content || null };
  const notes = { es: es?.notes || null, en: en?.notes || null };
  const problems = [];

  if (!nonBlank(db.title)) problems.push('missing_canonical_title');
  if (!nonBlank(db.slug)) problems.push('missing_slug');
  if (!nonBlank(es?.title)) problems.push('missing_title_es');
  if (!nonBlank(en?.title)) problems.push('missing_title_en');
  if (db.type !== catalog.type) problems.push(`type_mismatch:${catalog.type}->${db.type}`);
  if (db.title !== catalog.title) problems.push('canonical_title_mismatch');
  if (catalog.editorialTier === 'A' || catalog.editorialTier === 'B') {
    if (!nonBlank(summaries.es)) problems.push('missing_summary_es');
    if (!nonBlank(summaries.en)) problems.push('missing_summary_en');
    if (sources.length + directCitations.length === 0) problems.push('missing_source');
  }
  problems.push(
    ...coreFactProblems(
      { ...catalog, summaryEs: summaries.es, summaryEn: summaries.en },
      db,
      details,
      relations,
    ),
  );
  if (relations.length === 0) problems.push('degree_0');
  if (shouldHaveImage(db.type, catalog.editorialTier) && linkedMedia.length === 0)
    problems.push('missing_image');
  if (linkedMedia.length && browserMedia && !browserMedia.pass)
    problems.push('image_browser_broken');
  if (linkedMedia.length && hasHttpAudit && !imageHttpValid && browserMedia?.pass)
    problems.push('image_http_unstable');
  if (linkedMedia.length && hasHttpAudit && !imageHttpValid && !browserMedia)
    problems.push('image_http_broken');
  if (db.status !== 'PUBLISHED') problems.push('not_public');

  const categories = [];
  if (problems.some((problem) => problem.startsWith('missing_title') || problem === 'missing_slug'))
    categories.push('NEEDS_IDENTITY');
  const structuralOnly =
    catalog.editorialTier === 'C' &&
    ['CONCEPT', 'PLACE'].includes(db.type) &&
    relations.length > 0 &&
    !summaries.es &&
    !summaries.en &&
    !details.hasAny;
  if (
    !structuralOnly &&
    problems.some((problem) =>
      [
        'missing_date',
        'missing_life_dates',
        'missing_creator_relation',
        'missing_typed_facts',
        'missing_chronology',
        'missing_definition',
      ].includes(problem),
    )
  )
    categories.push('NEEDS_FACTS');
  if (problems.some((problem) => problem.startsWith('missing_summary')))
    categories.push('NEEDS_EDITORIAL');
  if (problems.includes('missing_source')) categories.push('NEEDS_SOURCE');
  if (problems.includes('missing_image')) categories.push('NEEDS_IMAGE');
  if (problems.includes('image_http_broken') || problems.includes('image_browser_broken'))
    categories.push('BROKEN_MEDIA');
  if (linkedMedia.some((link) => rightsStatus(link.media) === 'RIGHTS_REVIEW'))
    categories.push('RIGHTS_REVIEW');
  if (structuralOnly) categories.push('STRUCTURAL');
  if (!categories.length && !problems.includes('degree_0') && db.status === 'PUBLISHED')
    categories.push('READY');

  return {
    slug: db.slug,
    name: db.title,
    catalogName: catalog.title,
    class: db.kind,
    type: db.type,
    tier: catalog.editorialTier,
    dbExists: true,
    status: db.status,
    canonicalTitle: nonBlank(db.title),
    titleEs: nonBlank(es?.title),
    titleEn: nonBlank(en?.title),
    aliasCount: aliases.length,
    startYear: db.startYear,
    endYear: db.endYear,
    hasDates: present(db.startYear) || present(db.endYear),
    summaryEs: nonBlank(summaries.es),
    summaryEn: nonBlank(summaries.en),
    summaryEsStorage: nonBlank(es?.shortDescription)
      ? 'shortDescription'
      : nonBlank(es?.excerpt)
        ? 'excerpt'
        : nonBlank(db.summary)
          ? 'base'
          : null,
    summaryEnStorage: nonBlank(en?.shortDescription)
      ? 'shortDescription'
      : nonBlank(en?.excerpt)
        ? 'excerpt'
        : nonBlank(db.summary)
          ? 'base'
          : null,
    essayEs: nonBlank(essays.es),
    essayEn: nonBlank(essays.en),
    essayEsStorage: nonBlank(es?.essay) ? 'translation' : nonBlank(db.content) ? 'base' : null,
    essayEnStorage: nonBlank(en?.essay) ? 'translation' : nonBlank(db.content) ? 'base' : null,
    notesEs: nonBlank(notes.es),
    notesEn: nonBlank(notes.en),
    sourceCount: sources.length + directCitations.length,
    sourceRefCount: sources.length,
    citationCount: directCitations.length,
    sourceDomains: [...new Set(sources.map((source) => sourceDomain(source.url)).filter(Boolean))],
    typedDetails: details.hasAny,
    typedDetailModel: details.model,
    legacyDetailFields: details.legacyFields,
    attributeFields: details.attributeFields,
    mediaCount: linkedMedia.length,
    primaryImage:
      primary?.media?.displayUrl || primary?.media?.url || primary?.media?.canonicalUrl || null,
    imageProvider: primary?.media?.provider || null,
    imageHttpStatus: primary?.http?.status ?? null,
    imageHttpValid: primary?.http?.result === 'HTTP_VALID',
    imageBrowserRender: browserMedia?.pass ?? null,
    imageRights: primary ? rightsStatus(primary.media) : null,
    relations: relations.length,
    semanticRelations: semanticRelations.length,
    structuralRelations: structuralRelations.length,
    publicPage: db.status === 'PUBLISHED' ? 'EXPECTED' : 'NOT_PUBLIC',
    completenessCategory: [...new Set(categories)],
    problems: [...new Set(problems)],
    imagePriority: linkedMedia.length === 0 ? imagePriority(db.type, catalog.editorialTier) : null,
  };
});

const catalogRelationKeys = new Set(
  snapshot.catalog.relations.map((relation) => `${relation.from}|${relation.to}|${relation.type}`),
);
const dbRelationKeys = new Set(
  snapshot.db.relations.map(
    (relation) => `${relation.fromSlug}|${relation.toSlug}|${relation.type}`,
  ),
);
const foundationalSlugs = new Set(snapshot.catalog.entities.map((entity) => entity.slug));
const dbFoundationalRelations = snapshot.db.relations.filter(
  (relation) => foundationalSlugs.has(relation.fromSlug) && foundationalSlugs.has(relation.toSlug),
);
const missingCatalogRelations = snapshot.catalog.relations.filter(
  (relation) => !dbRelationKeys.has(`${relation.from}|${relation.to}|${relation.type}`),
);
const extraFoundationalRelations = dbFoundationalRelations.filter(
  (relation) =>
    !catalogRelationKeys.has(`${relation.fromSlug}|${relation.toSlug}|${relation.type}`),
);
const missingCatalogEntities = snapshot.catalog.entities.filter(
  (entity) => !dbBySlug.has(entity.slug),
);
const extraDbEntities = snapshot.db.entities.filter((entity) => !catalogBySlug.has(entity.slug));
const mismatchedEntities = inventory.filter((entity) =>
  entity.problems.some((problem) => problem.includes('mismatch')),
);
const duplicateDbSlugs = [...groupBy(snapshot.db.entities, 'slug').entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([slug, rows]) => ({ slug, count: rows.length }));

const tierSummaries = Object.fromEntries(
  ['A', 'B', 'C'].map((tier) => {
    const rows = inventory.filter((item) => item.tier === tier);
    return [
      tier,
      {
        entities: rows.length,
        ready: rows.filter((row) => row.completenessCategory.includes('READY')).length,
        structural: rows.filter((row) => row.completenessCategory.includes('STRUCTURAL')).length,
        byType: countBy(rows, 'type'),
        summaryEs: rows.filter((row) => row.summaryEs).length,
        summaryEn: rows.filter((row) => row.summaryEn).length,
        essayEs: rows.filter((row) => row.essayEs).length,
        essayEn: rows.filter((row) => row.essayEn).length,
        sources: rows.filter((row) => row.sourceCount > 0).length,
        typedDetails: rows.filter((row) => row.typedDetails).length,
        media: rows.filter((row) => row.mediaCount > 0).length,
        httpValidMedia: rows.filter((row) => row.imageHttpValid).length,
        degree0: rows.filter((row) => row.relations === 0).length,
        degree1: rows.filter((row) => row.relations === 1).length,
        degree2: rows.filter((row) => row.relations === 2).length,
        needsFacts: rows.filter((row) => row.completenessCategory.includes('NEEDS_FACTS')).length,
        needsEditorial: rows.filter((row) => row.completenessCategory.includes('NEEDS_EDITORIAL'))
          .length,
        needsSource: rows.filter((row) => row.completenessCategory.includes('NEEDS_SOURCE')).length,
        needsImage: rows.filter((row) => row.completenessCategory.includes('NEEDS_IMAGE')).length,
        brokenMedia: rows.filter((row) => row.completenessCategory.includes('BROKEN_MEDIA')).length,
      },
    ];
  }),
);

const sourceAudit = inventory
  .filter((row) => row.tier === 'A')
  .map((row) => {
    const db = dbBySlug.get(row.slug);
    const sources = db ? sourcesByEntity.get(db.id) || [] : [];
    const quality = sources.map(sourceQuality);
    return {
      entity: row.slug,
      name: row.name,
      type: row.type,
      sourceCount: row.sourceCount,
      sourceDomains: row.sourceDomains,
      institutional: quality.some((item) => item.institutional),
      scholarly: quality.some((item) => item.scholarly),
      genericReference: quality.some((item) => item.generic),
      obviousWeakFlag:
        row.sourceCount === 0 || (quality.length > 0 && quality.every((item) => item.generic)),
    };
  });

const allLinkedFoundationalMedia = inventory.flatMap((row) => {
  const db = dbBySlug.get(row.slug);
  return (db ? mediaLinksByEntity.get(db.id) || [] : []).map((link) => {
    const media = mediaById.get(link.mediaId) || {};
    const http =
      httpByMediaEntity.get(`${row.slug}|${link.mediaId}`) || httpByMediaId.get(link.mediaId) || {};
    return {
      entity: row.slug,
      name: row.name,
      type: row.type,
      tier: row.tier,
      mediaId: link.mediaId,
      role: link.role,
      primary: link.isPrimary,
      url: media.displayUrl || media.url || media.canonicalUrl || null,
      canonicalUrl: media.canonicalUrl,
      sourcePageUrl: media.sourcePageUrl,
      provider: media.provider,
      mime: http.contentType || media.mimeType,
      httpStatus: http.status ?? null,
      httpResult: http.result ?? null,
      redirect: http.redirected ?? null,
      finalUrl: http.finalUrl ?? null,
      fileSize: http.responseBytes ?? media.fileSize,
      width: media.width,
      height: media.height,
      license: media.license,
      rightsStatus: rightsStatus(media),
      browserRender: browserMediaBySlug.get(row.slug)?.pass ?? null,
    };
  });
});

const allMediaInventory = snapshot.db.media.map((media) => {
  const http = httpByMediaId.get(media.id) || {};
  const links = snapshot.db.entityMedia.filter((link) => link.mediaId === media.id);
  return {
    mediaId: media.id,
    linkedEntities: links.map((link) => link.slug),
    foundationalEntities: links
      .filter((link) => foundationalSlugs.has(link.slug))
      .map((link) => link.slug),
    linked: links.length > 0,
    url: media.displayUrl || media.url || media.canonicalUrl || null,
    canonicalUrl: media.canonicalUrl,
    sourcePageUrl: media.sourcePageUrl,
    provider: media.provider,
    declaredMime: media.mimeType,
    responseMime: http.contentType ?? null,
    httpStatus: http.status ?? null,
    httpResult: http.result ?? null,
    redirect: http.redirected ?? null,
    finalUrl: http.finalUrl ?? null,
    responseBytes: http.responseBytes ?? null,
    width: media.width,
    height: media.height,
    license: media.license,
    rightsStatus: rightsStatus(media),
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  snapshotGeneratedAt: snapshot.generatedAt,
  mode: snapshot.mode,
  server: snapshot.server,
  catalog: {
    entities: snapshot.catalog.entities.length,
    relations: snapshot.catalog.relations.length,
    tier: countBy(snapshot.catalog.entities, 'editorialTier'),
  },
  database: {
    totalEntities: snapshot.db.entities.length,
    totalRelations: snapshot.db.relations.length,
    foundationalEntities: inventory.filter((item) => item.dbExists).length,
    foundationalEndpointRelations: dbFoundationalRelations.length,
    matchedCatalogRelations: snapshot.catalog.relations.length - missingCatalogRelations.length,
    publishedEntities: snapshot.db.entities.filter((entity) => entity.status === 'PUBLISHED')
      .length,
    byClass: countBy(snapshot.db.entities, 'kind'),
    byType: countBy(snapshot.db.entities, 'type'),
    migrationsApplied: snapshot.db.migrations.filter(
      (migration) => migration.finishedAt && !migration.rolledBackAt,
    ).length,
    migrationsUnfinished: snapshot.db.migrations.filter(
      (migration) => !migration.finishedAt && !migration.rolledBackAt,
    ).length,
    latestMigration: snapshot.db.migrations.at(-1)?.name || null,
  },
  differences: {
    missingCatalogEntities: missingCatalogEntities.length,
    extraDbEntities: extraDbEntities.length,
    mismatchedEntities: mismatchedEntities.length,
    duplicateDbSlugs: duplicateDbSlugs.length,
    missingCatalogRelations: missingCatalogRelations.length,
    extraFoundationalRelations: extraFoundationalRelations.length,
  },
  globalFoundational: {
    entities: inventory.length,
    canonicalTitle: inventory.filter((row) => row.canonicalTitle).length,
    titleEs: inventory.filter((row) => row.titleEs).length,
    titleEn: inventory.filter((row) => row.titleEn).length,
    aliases: inventory.filter((row) => row.aliasCount > 0).length,
    dates: inventory.filter((row) => row.hasDates).length,
    summaryEs: inventory.filter((row) => row.summaryEs).length,
    summaryEn: inventory.filter((row) => row.summaryEn).length,
    essayEs: inventory.filter((row) => row.essayEs).length,
    essayEn: inventory.filter((row) => row.essayEn).length,
    notes: inventory.filter((row) => row.notesEs || row.notesEn).length,
    sources: inventory.filter((row) => row.sourceCount > 0).length,
    typedDetails: inventory.filter((row) => row.typedDetails).length,
    hasMedia: inventory.filter((row) => row.mediaCount > 0).length,
    httpValidMedia: inventory.filter((row) => row.imageHttpValid).length,
    degree0: inventory.filter((row) => row.relations === 0).length,
    degree1: inventory.filter((row) => row.relations === 1).length,
    degree2: inventory.filter((row) => row.relations === 2).length,
  },
  tiers: tierSummaries,
  workRemaining: {
    facts: inventory.filter((row) => row.completenessCategory.includes('NEEDS_FACTS')).length,
    summary: inventory.filter((row) => row.completenessCategory.includes('NEEDS_EDITORIAL')).length,
    sources: inventory.filter((row) => row.completenessCategory.includes('NEEDS_SOURCE')).length,
    images: inventory.filter((row) => row.completenessCategory.includes('NEEDS_IMAGE')).length,
    brokenMedia: inventory.filter((row) => row.completenessCategory.includes('BROKEN_MEDIA'))
      .length,
    rightsReview: allMediaInventory.filter((media) => media.rightsStatus === 'RIGHTS_REVIEW')
      .length,
  },
  media: {
    totalRows: snapshot.db.media.length,
    totalLinks: snapshot.db.entityMedia.length,
    foundationalLinks: allLinkedFoundationalMedia.length,
    foundationalEntitiesWithMedia: inventory.filter((row) => row.mediaCount > 0).length,
    foundationalEntitiesHttpValid: inventory.filter((row) => row.imageHttpValid).length,
    foundationalEntitiesBrowserValid: inventory.filter((row) => row.imageBrowserRender).length,
    rights: countBy(allLinkedFoundationalMedia, 'rightsStatus'),
    allMediaRights: countBy(allMediaInventory, 'rightsStatus'),
    allMediaHttpResults: countBy(allMediaInventory, 'httpResult'),
    providers: countBy(allLinkedFoundationalMedia, 'provider'),
  },
};

writeJson('summary.json', summary);
writeJson('entity-inventory.json', inventory);
writeJson('catalog-db-differences.json', {
  missingCatalogEntities,
  extraDbEntities,
  mismatchedEntities,
  duplicateDbSlugs,
  missingCatalogRelations,
  extraFoundationalRelations,
});
writeCsv('entity-inventory.csv', inventory);
writeCsv(
  'tier-a.csv',
  inventory.filter((row) => row.tier === 'A'),
);
writeCsv(
  'tier-b.csv',
  inventory.filter((row) => row.tier === 'B'),
);
writeCsv(
  'tier-c.csv',
  inventory.filter((row) => row.tier === 'C'),
);
writeCsv(
  'entities-missing-data.csv',
  inventory.filter((row) => !row.completenessCategory.includes('READY')),
);
writeCsv(
  'entities-missing-images.csv',
  inventory.filter((row) => row.completenessCategory.includes('NEEDS_IMAGE')),
);
writeCsv(
  'broken-images.csv',
  inventory.filter((row) => row.completenessCategory.includes('BROKEN_MEDIA')),
);
writeCsv('source-audit-tier-a.csv', sourceAudit);
writeCsv('media-inventory.csv', allLinkedFoundationalMedia);
writeCsv('all-media-inventory.csv', allMediaInventory);

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
