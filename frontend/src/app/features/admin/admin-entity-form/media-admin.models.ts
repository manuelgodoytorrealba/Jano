export type UploadPreviewDimensions = {
  width: number;
  height: number;
};

export type MediaDraft = {
  url: string;
  displayUrl: string;
  sourcePageUrl: string;
  alt: string;
  source: string;
  photoBy: string;
  license: string;
  role: string;
  sortOrder: number | string;
  isPrimary: boolean;
  displayMode: string;
  focalX: number | string | null;
  focalY: number | string | null;
};

export type EditableAdminMediaLink = {
  id: string;
  role: string;
  sortOrder: number | string;
  isPrimary: boolean;
  displayMode: string;
  focalX: number | string | null;
  focalY: number | string | null;
  media: {
    id: string;
    url: string;
    derivedFromMediaId?: string | null;
    canonicalUrl?: string | null;
    displayUrl?: string | null;
    sourcePageUrl?: string | null;
    alt?: string | null;
    source?: string | null;
    photoBy?: string | null;
    license?: string | null;
    provider?: string | null;
    qualityTier?: string | null;
    width?: number | null;
    height?: number | null;
    originType?: string | null;
    storageKey?: string | null;
    originalFilename?: string | null;
    fileSize?: number | null;
  };
  saving?: boolean;
  removing?: boolean;
  ingesting?: boolean;
  promoting?: boolean;
  restoring?: boolean;
};

export type MediaAddExternalSubmit = {
  draft: MediaDraft;
};

export type MediaAddUploadSubmit = {
  draft: MediaDraft;
  file: File;
  dimensions: UploadPreviewDimensions | null;
};

export const MEDIA_ROLE_OPTIONS = [
  'PRIMARY_LEGACY',
  'HERO',
  'CARD',
  'DETAIL',
  'THUMBNAIL',
  'EXPLORER_3D',
  'GALLERY',
] as const;

export const MEDIA_ADD_ROLE_OPTIONS = [
  'HERO',
  'CARD',
  'DETAIL',
  'GALLERY',
] as const;

export const MEDIA_ROLE_LABELS: Record<string, string> = {
  PRIMARY_LEGACY: 'Primary legacy',
  HERO: 'Hero',
  CARD: 'Card',
  DETAIL: 'Detail',
  THUMBNAIL: 'Thumbnail',
  EXPLORER_3D: 'Explorer 3D',
  GALLERY: 'Gallery',
};

export const MEDIA_DISPLAY_MODES = [
  { value: '', label: 'Auto' },
  { value: 'COVER', label: 'Cover' },
  { value: 'CONTAIN', label: 'Contain' },
];
