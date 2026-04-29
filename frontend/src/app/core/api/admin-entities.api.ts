import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { apiUrl } from './api-base';

export type AdminEntityPayload = {
  type: 'ARTWORK' | 'ARTIST' | 'ARTICLE' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'TEXT' | 'PLACE';
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  contentLevel?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  startYear?: number | null;
  endYear?: number | null;
};

export type AdminEntityDetailsPayload = {
  authorNation?: string;
  technique?: string;
  materials?: string;
  dimensions?: string;
  location?: string;
  collection?: string;
  state?: string;
  country?: string;
  city?: string;
  birthYear?: number | null;
  deathYear?: number | null;
  disciplines?: string;
  bioShort?: string;
  links?: string;
  definition?: string;
};

export type AdminSourceRefPayload = {
  sourceType: 'BOOK' | 'ARTICLE' | 'WEBSITE' | 'CATALOG' | 'PAPER';
  sourceTitle: string;
  sourceAuthor?: string;
  sourcePublisher?: string;
  sourceYear?: number | null;
  sourceUrl?: string;
  page?: string;
  quote?: string;
  note?: string;
};

export type AdminContributorPayload = {
  name: string;
  role: string;
  note?: string;
};

export type AdminMediaRole =
  | 'PRIMARY_LEGACY'
  | 'HERO'
  | 'CARD'
  | 'DETAIL'
  | 'THUMBNAIL'
  | 'EXPLORER_3D'
  | 'GALLERY';

export type AdminMediaDisplayMode = 'COVER' | 'CONTAIN';

export type AdminSlotCropKey = 'explorer3d' | 'list' | 'detail' | 'preview';

export type AdminSlotCrop = {
  x: number | null;
  y: number | null;
  zoom: number | null;
};

export type AdminSlotCropMap = Partial<Record<AdminSlotCropKey, AdminSlotCrop | null>>;

export type AdminEntityMediaPayload = {
  url: string;
  displayUrl?: string;
  sourcePageUrl?: string;
  alt?: string;
  source?: string;
  photoBy?: string;
  license?: string;
  role?: AdminMediaRole;
  sortOrder?: number;
  isPrimary?: boolean;
  displayMode?: AdminMediaDisplayMode | null;
  focalX?: number | null;
  focalY?: number | null;
  assetFocalX?: number | null;
  assetFocalY?: number | null;
  slotCrops?: AdminSlotCropMap;
};

export type AdminUploadEntityMediaPayload = {
  alt?: string;
  source?: string;
  photoBy?: string;
  license?: string;
  width?: number;
  height?: number;
  role?: AdminMediaRole;
  sortOrder?: number;
  isPrimary?: boolean;
  displayMode?: AdminMediaDisplayMode | null;
  focalX?: number | null;
  focalY?: number | null;
  assetFocalX?: number | null;
  assetFocalY?: number | null;
  slotCrops?: AdminSlotCropMap;
};

export type AdminMediaAsset = {
  assetId: string;
  id: string;
  url: string;
  originType: string | null;
  derivedFromMediaId: string | null;
  canonicalUrl: string | null;
  displayUrl: string | null;
  sourcePageUrl: string | null;
  storageKey: string | null;
  originalFilename: string | null;
  fileSize: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  isVector: boolean;
  provider: string | null;
  qualityTier: string | null;
  alt: string | null;
  source: string | null;
  photoBy: string | null;
  license: string | null;
  role: string | null;
  sortOrder: number | null;
  isPrimary: boolean;
  displayMode: AdminMediaDisplayMode | null;
  focalX: number | null;
  focalY: number | null;
  assetFocalX: number | null;
  assetFocalY: number | null;
  cropX: number | null;
  cropY: number | null;
  cropZoom: number | null;
};

export type AdminMediaAssignment = {
  assignmentId: string;
  assetId: string;
  role: AdminMediaRole | string | null;
  sortOrder: number;
  isPrimary: boolean;
  displayMode: AdminMediaDisplayMode | null;
  focalX: number | null;
  focalY: number | null;
  assetFocalX: number | null;
  assetFocalY: number | null;
  slotCrops: AdminSlotCropMap;
};

export type AdminResolvedSlot = {
  slotKey: 'explorer3d' | 'list' | 'detail' | 'preview';
  source: 'explicit' | 'fallback' | 'legacy' | 'empty';
  matchedRole: string | null;
  item: AdminMediaAsset | null;
  explanation: string;
  reasonCode: string;
};

export type AdminAdditionalMediaItem = {
  assignmentId: string;
  assetId: string;
  role: AdminMediaRole | string | null;
  sortOrder: number;
  item: AdminMediaAsset;
};

export type AdminMediaWarning = {
  code: string;
  severity: 'warning';
  message: string;
};

export type AdminMediaCoverageSummary = {
  coveredSlots: string[];
  emptySlots: string[];
  fallbackSlots: string[];
  explicitSlots: string[];
  legacySlots: string[];
  assetCount: number;
  assignmentCount: number;
  unusedAssetCount: number;
};

export type AdminMediaLibraryPayload = {
  assets: AdminMediaAsset[];
  assignments: AdminMediaAssignment[];
  resolvedSlots: AdminResolvedSlot[];
  additionalMedia: AdminAdditionalMediaItem[];
  warnings: AdminMediaWarning[];
  coverageSummary: AdminMediaCoverageSummary;
};

export type AdminEntityResponse = {
  id: string;
  type: AdminEntityPayload['type'];
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  contentLevel?: AdminEntityPayload['contentLevel'] | null;
  status?: AdminEntityPayload['status'] | null;
  startYear?: number | null;
  endYear?: number | null;
  mediaLinks?: any[];
  mediaLibrary?: AdminMediaLibraryPayload;
  resolvedMedia?: any;
  artwork?: any;
  artist?: any;
  concept?: any;
  period?: any;
  sourceRefs?: any[];
  contributors?: any[];
};

@Injectable({ providedIn: 'root' })
export class AdminEntitiesApi {
  private http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/entities');
  private readonly adminBaseUrl = apiUrl('/entities/admin');

  list(params?: Record<string, string | number | undefined>) {
    let httpParams = new HttpParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }

    return this.http.get<any>(this.adminBaseUrl, { params: httpParams });
  }

  getById(id: string) {
    return this.http.get<AdminEntityResponse>(`${this.adminBaseUrl}/${id}`);
  }

  updateDetails(id: string, data: AdminEntityDetailsPayload) {
    return this.http.patch<any>(`${this.baseUrl}/${id}/details`, data);
  }

  create(data: AdminEntityPayload) {
    return this.http.post<any>(this.baseUrl, data);
  }

  update(id: string, data: Partial<AdminEntityPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, data);
  }

  createMedia(entityId: string, data: AdminEntityMediaPayload) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/media`, data);
  }

  uploadMedia(entityId: string, file: File, data: AdminUploadEntityMediaPayload) {
    const formData = new FormData();
    formData.set('file', file);

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (typeof value === 'object') {
        formData.set(key, JSON.stringify(value));
        continue;
      }

      formData.set(key, String(value));
    }

    return this.http.post<any>(`${this.baseUrl}/${entityId}/media/upload`, formData);
  }

  updateMedia(entityId: string, linkId: string, data: Partial<AdminEntityMediaPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/${entityId}/media/${linkId}`, data);
  }

  ingestMedia(entityId: string, linkId: string) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/media/${linkId}/ingest`, {});
  }

  promoteIngestedMedia(entityId: string, linkId: string) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/media/${linkId}/promote`, {});
  }

  restoreExternalMedia(entityId: string, linkId: string) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/media/${linkId}/restore-external`, {});
  }

  deleteMedia(entityId: string, linkId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/media/${linkId}`);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${id}`);
  }

  listRelations(entityId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/${entityId}/relations`);
  }

  listIncomingRelations(entityId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/${entityId}/relations/incoming`);
  }

  createSourceRef(entityId: string, data: AdminSourceRefPayload) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/source-refs`, data);
  }

  updateSourceRef(entityId: string, refId: string, data: Partial<AdminSourceRefPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/${entityId}/source-refs/${refId}`, data);
  }

  deleteSourceRef(entityId: string, refId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/source-refs/${refId}`);
  }

  createContributor(entityId: string, data: AdminContributorPayload) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/contributors`, data);
  }

  updateContributor(entityId: string, contributorId: string, data: Partial<AdminContributorPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/${entityId}/contributors/${contributorId}`, data);
  }

  deleteContributor(entityId: string, contributorId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/contributors/${contributorId}`);
  }

  createRelation(
    entityId: string,
    data: { toId: string; type: string; justification?: string; weight?: number }
  ) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}/relations`, data);
  }

  deleteRelation(entityId: string, relationId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/relations/${relationId}`);
  }
  previewBySlug(slug: string) {
    return this.http.get<any>(`${this.baseUrl}/${slug}/preview`);
  }
}
