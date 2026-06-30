import { describe, expect, it } from 'vitest';

import {
  AdminEntityResponse,
  AdminMediaAsset,
  AdminMediaAssignment,
} from '../../../core/api/admin-entities.api';
import {
  buildAdminEntityMediaLibraryState,
  cloneMediaLink,
  emptySlotCropMap,
} from './admin-entity-media.helpers';
import { EditableAdminMediaEditor, EditableAdminMediaLink } from './media-admin.models';

const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === '' ? null : Number(value);

describe('admin-entity-media helpers', () => {
  it('refreshes persisted media without overwriting an unsaved editor draft', () => {
    const original = editableLink('CARD', 'https://example.com/old.jpg', 'Server alt');
    const dirtyEditor: EditableAdminMediaEditor = {
      id: original.id,
      persisted: original,
      draft: {
        ...cloneMediaLink(original, toNullableNumber),
        media: {
          ...original.media,
          alt: 'Unsaved alt',
        },
      },
      isDirty: true,
      saveState: 'idle',
      errorMessage: '',
      removing: false,
      ingesting: false,
      promoting: false,
      restoring: false,
    };

    const state = buildAdminEntityMediaLibraryState({
      entity: entityWithMedia('DETAIL', 'https://example.com/new.jpg', 'Fresh server alt'),
      mediaEditors: [dirtyEditor],
      activeMediaEditorId: original.id,
      activeMediaLibraryView: 'library',
      preserveDirtyEditors: true,
      toNullableNumber,
    });

    expect(state.mediaEditors[0]).toEqual(
      expect.objectContaining({
        isDirty: true,
        persisted: expect.objectContaining({
          role: 'DETAIL',
          media: expect.objectContaining({ url: 'https://example.com/new.jpg' }),
        }),
        draft: expect.objectContaining({
          role: 'CARD',
          media: expect.objectContaining({ alt: 'Unsaved alt' }),
        }),
      }),
    );
  });
});

function editableLink(role: string, url: string, alt: string): EditableAdminMediaLink {
  return {
    id: 'assignment-1',
    role,
    sortOrder: 0,
    isPrimary: false,
    displayMode: 'COVER',
    focalX: null,
    focalY: null,
    assetFocalX: null,
    assetFocalY: null,
    slotCrops: emptySlotCropMap(),
    media: {
      id: 'asset-1',
      url,
      alt,
      originType: 'EXTERNAL_URL',
    },
  };
}

function entityWithMedia(role: string, url: string, alt: string): AdminEntityResponse {
  const asset: AdminMediaAsset = {
    assetId: 'asset-1',
    id: 'asset-1',
    url,
    originType: 'EXTERNAL_URL',
    derivedFromMediaId: null,
    canonicalUrl: null,
    displayUrl: url,
    sourcePageUrl: null,
    storageKey: null,
    originalFilename: null,
    fileSize: null,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 900,
    isVector: false,
    provider: null,
    qualityTier: null,
    alt,
    source: null,
    photoBy: null,
    license: null,
    role,
    sortOrder: 0,
    isPrimary: false,
    displayMode: 'COVER',
    focalX: null,
    focalY: null,
    assetFocalX: null,
    assetFocalY: null,
    cropX: null,
    cropY: null,
    cropZoom: null,
  };
  const assignment: AdminMediaAssignment = {
    assignmentId: 'assignment-1',
    assetId: asset.assetId,
    role,
    sortOrder: 0,
    isPrimary: false,
    displayMode: 'COVER',
    focalX: null,
    focalY: null,
    assetFocalX: null,
    assetFocalY: null,
    slotCrops: emptySlotCropMap(),
  };

  return {
    id: 'entity-1',
    type: 'ARTWORK',
    title: 'Guernica',
    slug: 'guernica',
    mediaLibrary: {
      assets: [asset],
      assignments: [assignment],
      resolvedSlots: [],
      additionalMedia: [],
      warnings: [],
      coverageSummary: {
        coveredSlots: [],
        emptySlots: [],
        fallbackSlots: [],
        explicitSlots: [],
        legacySlots: [],
        assetCount: 1,
        assignmentCount: 1,
        unusedAssetCount: 0,
      },
    },
  };
}
