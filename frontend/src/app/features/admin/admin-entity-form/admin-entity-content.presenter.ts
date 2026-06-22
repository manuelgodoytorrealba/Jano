import {
  AdminEntityDetailsPayload,
  AdminEntityPayload,
  AdminEntityResponse,
  AdminEntityTranslationPayload,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import {
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewTranslationForm,
} from './admin-entity-preview.presenter';

export type TranslationCompleteness = 'complete' | 'partial' | 'missing';

export function createEmptyTranslationForm(): AdminEntityPreviewTranslationForm {
  return { title: '', shortDescription: '', essay: '', notes: '', excerpt: '' };
}

export function createEmptyLocalizedDetailsForm(): AdminEntityPreviewLocalizedDetailsForm {
  return {
    authorNation: '',
    technique: '',
    materials: '',
    dimensions: '',
    location: '',
    collection: '',
    state: '',
    country: '',
    city: '',
    disciplines: '',
    bioShort: '',
    links: '',
    definition: '',
  };
}

export function translationStatus(
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>,
  locale: AdminLocale,
): TranslationCompleteness {
  const form = translations[locale];
  const fields = [form.title, form.shortDescription, form.essay, form.notes, form.excerpt].map(
    (value) => (value ?? '').trim(),
  );
  const filled = fields.filter(Boolean).length;

  if (!filled) {
    return 'missing';
  }

  return form.title.trim() &&
    (form.shortDescription.trim() || form.excerpt.trim()) &&
    form.essay.trim()
    ? 'complete'
    : 'partial';
}

export function translationStatusLabel(status: TranslationCompleteness): string {
  if (status === 'complete') return 'Complete';
  if (status === 'partial') return 'Partial';
  return 'Missing';
}

export function translationStatusMark(status: TranslationCompleteness): string {
  if (status === 'complete') return '✓';
  if (status === 'partial') return '◐';
  return '○';
}

export function buildEntityPayload(
  form: {
    type: AdminEntityPayload['type'];
    title: string;
    slug: string;
    summary: string;
    content: string;
    contentLevel: '' | NonNullable<AdminEntityPayload['contentLevel']>;
    status: NonNullable<AdminEntityPayload['status']>;
    startYear: number | null | string;
    endYear: number | null | string;
  },
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>,
): AdminEntityPayload {
  const spanish = translations.es;
  const title = spanish.title.trim() || (form.title ?? '').trim();
  const summary =
    spanish.shortDescription.trim() || spanish.excerpt.trim() || (form.summary ?? '').trim();
  const content = spanish.essay.trim() || (form.content ?? '').trim();

  return {
    type: form.type,
    title,
    slug: (form.slug ?? '').trim(),
    summary: summary || undefined,
    content: content || undefined,
    contentLevel: form.contentLevel || undefined,
    status: form.status || undefined,
    startYear:
      form.startYear !== null && form.startYear !== '' ? Number(form.startYear) : undefined,
    endYear: form.endYear !== null && form.endYear !== '' ? Number(form.endYear) : undefined,
  };
}

export function applyTranslations(
  entity: AdminEntityResponse,
): Record<AdminLocale, AdminEntityPreviewTranslationForm> {
  const next: Record<AdminLocale, AdminEntityPreviewTranslationForm> = {
    es: {
      title: entity.title ?? '',
      shortDescription: entity.summary ?? '',
      essay: entity.content ?? '',
      notes: '',
      excerpt: entity.summary ?? '',
    },
    en: createEmptyTranslationForm(),
  };

  for (const translation of entity.translations ?? []) {
    const locale = translation.locale === 'en' ? 'en' : translation.locale === 'es' ? 'es' : null;
    if (!locale) continue;

    next[locale] = {
      title: translation.title ?? '',
      shortDescription: translation.shortDescription ?? '',
      essay: translation.essay ?? '',
      notes: translation.notes ?? '',
      excerpt: translation.excerpt ?? '',
    };
  }

  return next;
}

export function extractLocalizedDetailsForm(
  entity: AdminEntityResponse,
  locale: AdminLocale,
): AdminEntityPreviewLocalizedDetailsForm {
  if (locale === 'es') {
    return {
      authorNation: entity?.artwork?.authorNation ?? '',
      technique: entity?.artwork?.technique ?? '',
      materials: entity?.artwork?.materials ?? '',
      dimensions: entity?.artwork?.dimensions ?? '',
      location: entity?.artwork?.location ?? '',
      collection: entity?.artwork?.collection ?? '',
      state: entity?.artwork?.state ?? '',
      country: entity?.artist?.country ?? '',
      city: entity?.artist?.city ?? '',
      disciplines: entity?.artist?.disciplines ?? '',
      bioShort: entity?.artist?.bioShort ?? '',
      links: entity?.artist?.links ?? '',
      definition: entity?.concept?.definition ?? entity?.period?.definition ?? '',
    };
  }

  const artworkTranslation =
    entity?.artwork?.translations?.find(
      (item: { locale?: string | null }) => item?.locale === locale,
    ) ?? null;
  const artistTranslation =
    entity?.artist?.translations?.find(
      (item: { locale?: string | null }) => item?.locale === locale,
    ) ?? null;
  const conceptTranslation =
    entity?.concept?.translations?.find(
      (item: { locale?: string | null }) => item?.locale === locale,
    ) ?? null;
  const periodTranslation =
    entity?.period?.translations?.find(
      (item: { locale?: string | null }) => item?.locale === locale,
    ) ?? null;

  return {
    authorNation: artworkTranslation?.authorNation ?? '',
    technique: artworkTranslation?.technique ?? '',
    materials: artworkTranslation?.materials ?? '',
    dimensions: artworkTranslation?.dimensions ?? '',
    location: artworkTranslation?.location ?? '',
    collection: artworkTranslation?.collection ?? '',
    state: artworkTranslation?.state ?? '',
    country: artistTranslation?.country ?? '',
    city: artistTranslation?.city ?? '',
    disciplines: artistTranslation?.disciplines ?? '',
    bioShort: artistTranslation?.bioShort ?? '',
    links: artistTranslation?.links ?? '',
    definition: conceptTranslation?.definition ?? periodTranslation?.definition ?? '',
  };
}

export function buildLocalizedDetailsPayload(
  form: AdminEntityPreviewLocalizedDetailsForm,
  toNullableNumber: (value: unknown) => number | null,
  birthYear?: unknown,
  deathYear?: unknown,
): AdminEntityDetailsPayload | undefined {
  const payload: AdminEntityDetailsPayload = {
    authorNation: String(form.authorNation ?? '').trim() || undefined,
    technique: String(form.technique ?? '').trim() || undefined,
    materials: String(form.materials ?? '').trim() || undefined,
    dimensions: String(form.dimensions ?? '').trim() || undefined,
    location: String(form.location ?? '').trim() || undefined,
    collection: String(form.collection ?? '').trim() || undefined,
    state: String(form.state ?? '').trim() || undefined,
    country: String(form.country ?? '').trim() || undefined,
    city: String(form.city ?? '').trim() || undefined,
    birthYear: toNullableNumber(birthYear),
    deathYear: toNullableNumber(deathYear),
    disciplines: String(form.disciplines ?? '').trim() || undefined,
    bioShort: String(form.bioShort ?? '').trim() || undefined,
    links: String(form.links ?? '').trim() || undefined,
    definition: String(form.definition ?? '').trim() || undefined,
  };

  return Object.values(payload).some(
    (value) => value !== undefined && value !== null && String(value).trim() !== '',
  )
    ? payload
    : undefined;
}

export function buildTranslationPayload(
  locale: AdminLocale,
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>,
  detailsForm: AdminEntityDetailsPayload,
  localizedDetailForms: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm>,
  toNullableNumber: (value: unknown) => number | null,
): AdminEntityTranslationPayload {
  const form = translations[locale];
  const details =
    locale === 'es'
      ? buildLocalizedDetailsPayload(
          detailsForm as AdminEntityPreviewLocalizedDetailsForm,
          toNullableNumber,
          detailsForm.birthYear,
          detailsForm.deathYear,
        )
      : buildLocalizedDetailsPayload(localizedDetailForms[locale], toNullableNumber);

  return {
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim() || null,
    essay: form.essay.trim() || null,
    notes: form.notes.trim() || null,
    excerpt: form.excerpt.trim() || null,
    details,
  };
}

export function contentFieldLabel(type: AdminEntityPayload['type']): string {
  return type === 'ARTICLE' ? 'Cuerpo del articulo' : 'Contenido';
}

export function contentFieldHint(type: AdminEntityPayload['type']): string {
  return type === 'ARTICLE'
    ? 'Usa #, ## y ### para titulos, > para citas, :::lead ... ::: para texto grande, y [[slug]] o [[slug|texto]] para enlazar entidades.'
    : 'Texto principal de la entidad. Puedes usar [[slug]] o [[slug|texto]] para enlazar.';
}

export function summaryFieldHint(type: AdminEntityPayload['type']): string {
  return type === 'ARTICLE'
    ? 'Entradilla breve para la portada y el hero del articulo.'
    : 'Resumen breve de la entidad.';
}

export function typedDetailsSummary(
  type: AdminEntityPayload['type'],
  detailsForm: AdminEntityDetailsPayload,
): string {
  switch (type) {
    case 'ARTWORK':
      return compactJoin([
        detailsForm.technique,
        detailsForm.materials,
        detailsForm.dimensions,
        detailsForm.location,
      ]);
    case 'ARTIST':
      return compactJoin([detailsForm.country, detailsForm.city, detailsForm.disciplines]);
    case 'CONCEPT':
    case 'PERIOD':
      return String(detailsForm.definition ?? '').trim();
    default:
      return '';
  }
}

function compactJoin(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}
