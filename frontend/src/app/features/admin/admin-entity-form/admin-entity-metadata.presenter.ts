import {
  AdminContributorPayload,
  AdminSourceRefPayload,
} from '../../../core/api/admin-entities.api';

export type AdminEditableSourceRef = {
  id: string;
  sourceType: AdminSourceRefPayload['sourceType'];
  sourceTitle: string;
  sourceTitleEs: string;
  sourceTitleEn: string;
  sourceAuthor: string;
  sourceAuthorEs: string;
  sourceAuthorEn: string;
  sourcePublisher: string;
  sourcePublisherEs: string;
  sourcePublisherEn: string;
  sourceYear: number | null;
  sourceUrl: string;
  page: string;
  quote: string;
  quoteEs: string;
  quoteEn: string;
  note: string;
  noteEs: string;
  noteEn: string;
};

export type AdminEditableContributor = {
  id: string;
  name: string;
  role: string;
  note: string;
};

export function createEmptySourceRefDraft(): AdminSourceRefPayload {
  return {
    sourceType: 'WEBSITE',
    sourceTitle: '',
    sourceTitleEs: '',
    sourceTitleEn: '',
    sourceAuthor: '',
    sourceAuthorEs: '',
    sourceAuthorEn: '',
    sourcePublisher: '',
    sourcePublisherEs: '',
    sourcePublisherEn: '',
    sourceYear: null,
    sourceUrl: '',
    page: '',
    quote: '',
    quoteEs: '',
    quoteEn: '',
    note: '',
    noteEs: '',
    noteEn: '',
  };
}

export function createEmptyContributorDraft(): AdminContributorPayload {
  return {
    name: '',
    role: '',
    note: '',
  };
}

export function normalizeSourceRef(ref: {
  id: string;
  page?: string | null;
  quote?: string | null;
  quoteEs?: string | null;
  quoteEn?: string | null;
  note?: string | null;
  noteEs?: string | null;
  noteEn?: string | null;
  source?: {
    type?: AdminSourceRefPayload['sourceType'] | null;
    title?: string | null;
    titleEs?: string | null;
    titleEn?: string | null;
    author?: string | null;
    authorEs?: string | null;
    authorEn?: string | null;
    publisher?: string | null;
    publisherEs?: string | null;
    publisherEn?: string | null;
    year?: number | null;
    url?: string | null;
  } | null;
}): AdminEditableSourceRef {
  return {
    id: ref.id,
    sourceType: ref.source?.type ?? 'WEBSITE',
    sourceTitle: ref.source?.title ?? '',
    sourceTitleEs: ref.source?.titleEs ?? ref.source?.title ?? '',
    sourceTitleEn: ref.source?.titleEn ?? '',
    sourceAuthor: ref.source?.author ?? '',
    sourceAuthorEs: ref.source?.authorEs ?? ref.source?.author ?? '',
    sourceAuthorEn: ref.source?.authorEn ?? '',
    sourcePublisher: ref.source?.publisher ?? '',
    sourcePublisherEs: ref.source?.publisherEs ?? ref.source?.publisher ?? '',
    sourcePublisherEn: ref.source?.publisherEn ?? '',
    sourceYear: ref.source?.year ?? null,
    sourceUrl: ref.source?.url ?? '',
    page: ref.page ?? '',
    quote: ref.quote ?? '',
    quoteEs: ref.quoteEs ?? ref.quote ?? '',
    quoteEn: ref.quoteEn ?? '',
    note: ref.note ?? '',
    noteEs: ref.noteEs ?? ref.note ?? '',
    noteEn: ref.noteEn ?? '',
  };
}

export function buildSourceRefPayload(
  source: Partial<AdminEditableSourceRef | AdminSourceRefPayload>,
  toNullableNumber: (value: unknown) => number | null,
): { payload: AdminSourceRefPayload | null; error: string | null } {
  const title = String(source.sourceTitleEs ?? source.sourceTitle ?? '').trim();
  if (!title) {
    return { payload: null, error: 'El titulo de la fuente es obligatorio.' };
  }

  return {
    payload: {
      sourceType: source.sourceType ?? 'WEBSITE',
      sourceTitle: title,
      sourceTitleEs: String(source.sourceTitleEs ?? source.sourceTitle ?? '').trim() || undefined,
      sourceTitleEn: String(source.sourceTitleEn ?? '').trim() || undefined,
      sourceAuthor: String(source.sourceAuthor ?? source.sourceAuthorEs ?? '').trim() || undefined,
      sourceAuthorEs:
        String(source.sourceAuthorEs ?? source.sourceAuthor ?? '').trim() || undefined,
      sourceAuthorEn: String(source.sourceAuthorEn ?? '').trim() || undefined,
      sourcePublisher:
        String(source.sourcePublisher ?? source.sourcePublisherEs ?? '').trim() || undefined,
      sourcePublisherEs:
        String(source.sourcePublisherEs ?? source.sourcePublisher ?? '').trim() || undefined,
      sourcePublisherEn: String(source.sourcePublisherEn ?? '').trim() || undefined,
      sourceYear: toNullableNumber(source.sourceYear),
      sourceUrl: String(source.sourceUrl ?? '').trim() || undefined,
      page: String(source.page ?? '').trim() || undefined,
      quote: String(source.quote ?? source.quoteEs ?? '').trim() || undefined,
      quoteEs: String(source.quoteEs ?? source.quote ?? '').trim() || undefined,
      quoteEn: String(source.quoteEn ?? '').trim() || undefined,
      note: String(source.note ?? source.noteEs ?? '').trim() || undefined,
      noteEs: String(source.noteEs ?? source.note ?? '').trim() || undefined,
      noteEn: String(source.noteEn ?? '').trim() || undefined,
    },
    error: null,
  };
}

export function upsertSourceRef(
  collection: AdminEditableSourceRef[],
  ref: AdminEditableSourceRef,
): AdminEditableSourceRef[] {
  const existingIndex = collection.findIndex((item) => item.id === ref.id);
  if (existingIndex >= 0) {
    const next = [...collection];
    next[existingIndex] = ref;
    return next;
  }

  return [...collection, ref];
}

export function normalizeContributor(contributor: {
  id: string;
  name?: string | null;
  role?: string | null;
  note?: string | null;
}): AdminEditableContributor {
  return {
    id: contributor.id,
    name: contributor.name ?? '',
    role: contributor.role ?? '',
    note: contributor.note ?? '',
  };
}

export function buildContributorPayload(
  source: Partial<AdminEditableContributor | AdminContributorPayload>,
): { payload: AdminContributorPayload | null; error: string | null } {
  const name = String(source.name ?? '').trim();
  const role = String(source.role ?? '').trim();

  if (!name || !role) {
    return { payload: null, error: 'Nombre y rol del colaborador son obligatorios.' };
  }

  return {
    payload: {
      name,
      role,
      note: String(source.note ?? '').trim() || undefined,
    },
    error: null,
  };
}

export function upsertContributor(
  collection: AdminEditableContributor[],
  contributor: AdminEditableContributor,
): AdminEditableContributor[] {
  const existingIndex = collection.findIndex((item) => item.id === contributor.id);
  if (existingIndex >= 0) {
    const next = [...collection];
    next[existingIndex] = contributor;
    return next;
  }

  return [...collection, contributor];
}
