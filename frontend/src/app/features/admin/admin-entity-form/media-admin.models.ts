export type UploadPreviewDimensions = {
  width: number;
  height: number;
};

export type MediaEditorSlotKey = 'explorer3d' | 'list' | 'detail' | 'preview';

export type MediaSlotCrop = {
  x: number | null;
  y: number | null;
  zoom: number | null;
};

export type MediaSlotCropMap = Record<MediaEditorSlotKey, MediaSlotCrop>;

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
  assetFocalX: number | string | null;
  assetFocalY: number | string | null;
  slotCrops: MediaSlotCropMap;
};

export type EditableAdminMediaLink = {
  id: string;
  role: string;
  sortOrder: number | string;
  isPrimary: boolean;
  displayMode: string;
  focalX: number | string | null;
  focalY: number | string | null;
  assetFocalX: number | string | null;
  assetFocalY: number | string | null;
  slotCrops: MediaSlotCropMap;
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
    focalX?: number | null;
    focalY?: number | null;
    assetFocalX?: number | null;
    assetFocalY?: number | null;
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

export type EditableAdminMediaEditor = {
  id: string;
  persisted: EditableAdminMediaLink;
  draft: EditableAdminMediaLink;
  isDirty: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string;
  removing: boolean;
  ingesting: boolean;
  promoting: boolean;
  restoring: boolean;
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
  'EXPLORER_3D',
  'CARD',
  'DETAIL',
  'THUMBNAIL',
  'GALLERY',
] as const;

export const MEDIA_ROLE_LABELS: Record<string, string> = {
  PRIMARY_LEGACY: 'Fallback legacy',
  HERO: 'Detail destacado',
  CARD: 'List',
  DETAIL: 'Detail',
  THUMBNAIL: 'Preview',
  EXPLORER_3D: 'Explorer 3D',
  GALLERY: 'Additional Media',
};

export const MEDIA_DISPLAY_MODES = [
  { value: '', label: 'Auto' },
  { value: 'COVER', label: 'Cover' },
  { value: 'CONTAIN', label: 'Contain' },
];

export const MEDIA_PRIMARY_ROLE_PILLS = [
  { role: 'EXPLORER_3D', label: 'Explorer 3D' },
  { role: 'CARD', label: 'List' },
  { role: 'DETAIL', label: 'Detail' },
  { role: 'THUMBNAIL', label: 'Preview' },
] as const;

export const MEDIA_SECONDARY_ROLE_PILLS = [
  { role: 'GALLERY', label: 'Additional Media' },
  { role: 'HERO', label: 'Detail destacado' },
] as const;

export const MEDIA_EDITOR_SLOT_OPTIONS: Array<{
  key: MediaEditorSlotKey;
  label: string;
  frame: 'square' | 'portrait' | 'landscape';
}> = [
  { key: 'explorer3d', label: 'Explorer 3D', frame: 'square' },
  { key: 'list', label: 'List', frame: 'square' },
  { key: 'detail', label: 'Detail', frame: 'landscape' },
  { key: 'preview', label: 'Preview', frame: 'portrait' },
];
