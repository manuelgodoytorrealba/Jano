import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { apiUrl } from './api-base';
import { PublicEntityResolvedMedia, type PublicKnowledgeEntityKind } from './entities.models';
import { GraphResponseDto } from './graph.models';

export type AdminLocale = 'es' | 'en';

export type AdminEntityTranslationPayload = {
  title: string;
  shortDescription?: string | null;
  essay?: string | null;
  notes?: string | null;
  excerpt?: string | null;
  details?: AdminEntityDetailsPayload;
};

export type AdminEntityTranslation = AdminEntityTranslationPayload & {
  id: string;
  entityId: string;
  locale: AdminLocale | string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminTranslationStatus = Record<string, 'complete' | 'partial' | 'missing'>;

export type AdminEntityPayload = {
  type:
    | 'ARTWORK'
    | 'ARTIST'
    | 'ARTICLE'
    | 'CONCEPT'
    | 'MOVEMENT'
    | 'PERIOD'
    | 'TEXT'
    | 'PLACE'
    | 'EVENT'
    | 'ORGANIZATION';
  kind?: PublicKnowledgeEntityKind;
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
  sourceTitleEs?: string;
  sourceTitleEn?: string;
  sourceAuthor?: string;
  sourceAuthorEs?: string;
  sourceAuthorEn?: string;
  sourcePublisher?: string;
  sourcePublisherEs?: string;
  sourcePublisherEn?: string;
  sourceYear?: number | null;
  sourceUrl?: string;
  page?: string;
  quote?: string;
  quoteEs?: string;
  quoteEn?: string;
  note?: string;
  noteEs?: string;
  noteEn?: string;
};

export type AdminContributorPayload = {
  name: string;
  role: string;
  note?: string;
};

export type AdminEntitySourceRecord = {
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
};

export type AdminEntitySourceRefRecord = {
  id: string;
  page?: string | null;
  quote?: string | null;
  quoteEs?: string | null;
  quoteEn?: string | null;
  note?: string | null;
  noteEs?: string | null;
  noteEn?: string | null;
  source?: AdminEntitySourceRecord | null;
};

export type AdminEntityContributorRecord = {
  id: string;
  name?: string | null;
  role?: string | null;
  note?: string | null;
};

export type AdminEntityTagRecord = {
  id?: string | null;
  tagId?: string | null;
  source?: string | null;
  tag?: {
    id?: string | null;
    slug?: string | null;
    label?: string | null;
    category?: string | null;
    description?: string | null;
    isActive?: boolean | null;
  } | null;
};

export type AdminEntityClassificationRecord = {
  confidence?: number | null;
  source?: string | null;
  term?: {
    id?: string | null;
    key?: string | null;
    label?: string | null;
    taxonomy?: {
      id?: string | null;
      key?: string | null;
      label?: string | null;
    } | null;
  } | null;
};

export type AdminEntityClassificationPayload = {
  termId: string;
  confidence?: number;
  source?: string;
};

export type AdminEntityAliasKind =
  | 'ALTERNATE_TITLE'
  | 'COMMON_NAME'
  | 'MISSPELLING'
  | 'TRANSLITERATION'
  | 'NICKNAME'
  | 'SEARCH_HINT';

export type AdminEntityAliasPayload = {
  locale?: AdminLocale | 'und';
  value: string;
  kind?: AdminEntityAliasKind;
  weight?: number | null;
  source?: string | null;
};

export type AdminEntityAliasRecord = {
  id: string;
  entityId?: string | null;
  locale?: AdminLocale | 'und' | string | null;
  value: string;
  kind: AdminEntityAliasKind | string;
  weight?: number | null;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminEntityArtworkRecord = {
  authorNation?: string | null;
  technique?: string | null;
  materials?: string | null;
  dimensions?: string | null;
  location?: string | null;
  collection?: string | null;
  state?: string | null;
  translations?: Array<{
    locale?: string | null;
    authorNation?: string | null;
    technique?: string | null;
    materials?: string | null;
    dimensions?: string | null;
    location?: string | null;
    collection?: string | null;
    state?: string | null;
  }> | null;
};

export type AdminEntityArtistRecord = {
  country?: string | null;
  city?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  disciplines?: string | null;
  bioShort?: string | null;
  links?: string | null;
  translations?: Array<{
    locale?: string | null;
    country?: string | null;
    city?: string | null;
    disciplines?: string | null;
    bioShort?: string | null;
    links?: string | null;
  }> | null;
};

export type AdminEntityConceptRecord = {
  definition?: string | null;
  translations?: Array<{
    locale?: string | null;
    definition?: string | null;
  }> | null;
};

export type AdminEntityPeriodRecord = {
  definition?: string | null;
  translations?: Array<{
    locale?: string | null;
    definition?: string | null;
  }> | null;
};

export type AdminEntitySearchListItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  kind?: PublicKnowledgeEntityKind | null;
  summary?: string | null;
  status?: string | null;
  contentLevel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedMedia?: PublicEntityResolvedMedia | null;
  editorialSummary?: {
    visualSource: 'explicit' | 'fallback' | 'empty';
    relationsCount: number;
    sourcesCount: number;
    translationStatus: AdminTranslationStatus;
  };
};

export type AdminEntityListResponse = {
  items: AdminEntitySearchListItem[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export type AdminEntityRelationEndpoint = {
  id: string;
  slug: string;
  title: string;
  type: string;
  kind?: PublicKnowledgeEntityKind | null;
};

export type AdminEntityRelationRecord = {
  id: string;
  type: string;
  relationTypeId?: string | null;
  relationTypeKey?: string | null;
  relationTypeLabel?: string | null;
  relationType?: {
    id?: string | null;
    key?: string | null;
    label?: string | null;
  } | null;
  justification?: string | null;
  justificationEs?: string | null;
  justificationEn?: string | null;
  weight?: number | null;
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
  from?: AdminEntityRelationEndpoint | null;
  to?: AdminEntityRelationEndpoint | null;
};

export type AdminCreateRelationPayload = {
  toId: string;
  type?: string;
  relationTypeId?: string;
  justification?: string;
  justificationEs?: string;
  justificationEn?: string;
  weight?: number;
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
};

export type AdminUpdateRelationPayload = {
  type?: string;
  relationTypeId?: string;
  justification?: string;
  justificationEs?: string;
  justificationEn?: string;
  weight?: number;
  status?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
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
  kind?: PublicKnowledgeEntityKind | null;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  contentLevel?: AdminEntityPayload['contentLevel'] | null;
  status?: AdminEntityPayload['status'] | null;
  startYear?: number | null;
  endYear?: number | null;
  mediaLinks?: Array<Record<string, unknown>>;
  mediaLibrary?: AdminMediaLibraryPayload;
  resolvedMedia?: Record<string, unknown> | null;
  artwork?: AdminEntityArtworkRecord | null;
  artist?: AdminEntityArtistRecord | null;
  concept?: AdminEntityConceptRecord | null;
  period?: AdminEntityPeriodRecord | null;
  sourceRefs?: AdminEntitySourceRefRecord[];
  contributors?: AdminEntityContributorRecord[];
  tags?: AdminEntityTagRecord[];
  classifications?: AdminEntityClassificationRecord[];
  aliases?: AdminEntityAliasRecord[];
  translations?: AdminEntityTranslation[];
  translationStatus?: AdminTranslationStatus;
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

    return this.http.get<AdminEntityListResponse>(this.adminBaseUrl, { params: httpParams });
  }

  getById(id: string) {
    return this.http.get<AdminEntityResponse>(`${this.adminBaseUrl}/${id}`);
  }

  updateDetails(id: string, data: AdminEntityDetailsPayload) {
    return this.http.patch<AdminEntityResponse>(`${this.baseUrl}/${id}/details`, data);
  }

  create(data: AdminEntityPayload) {
    return this.http.post<AdminEntityResponse>(this.baseUrl, data);
  }

  createDraft(type: AdminEntityPayload['type']) {
    return this.http.post<AdminEntityResponse>(`${this.baseUrl}/drafts`, { type });
  }

  update(id: string, data: Partial<AdminEntityPayload>) {
    return this.http.patch<AdminEntityResponse>(`${this.baseUrl}/${id}`, data);
  }
  upsertTranslation(id: string, locale: AdminLocale, data: AdminEntityTranslationPayload) {
    return this.http.patch<AdminEntityResponse>(
      this.baseUrl + '/' + id + '/translations/' + locale,
      data,
    );
  }

  createAlias(id: string, data: AdminEntityAliasPayload) {
    return this.http.post<AdminEntityResponse>(`${this.baseUrl}/${id}/aliases`, data);
  }

  updateAlias(id: string, aliasId: string, data: Partial<AdminEntityAliasPayload>) {
    return this.http.patch<AdminEntityResponse>(`${this.baseUrl}/${id}/aliases/${aliasId}`, data);
  }

  deleteAlias(id: string, aliasId: string) {
    return this.http.delete<AdminEntityResponse>(`${this.baseUrl}/${id}/aliases/${aliasId}`);
  }

  addClassification(id: string, data: AdminEntityClassificationPayload) {
    return this.http.post<AdminEntityClassificationRecord>(
      `${this.baseUrl}/${id}/classifications`,
      data,
    );
  }

  removeClassification(id: string, termId: string) {
    return this.http.delete<{ ok: true }>(`${this.baseUrl}/${id}/classifications/${termId}`);
  }

  createMedia(entityId: string, data: AdminEntityMediaPayload) {
    return this.http.post<AdminEntityResponse>(`${this.baseUrl}/${entityId}/media`, data);
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

    return this.http.post<AdminEntityResponse>(
      `${this.baseUrl}/${entityId}/media/upload`,
      formData,
    );
  }

  updateMedia(entityId: string, linkId: string, data: Partial<AdminEntityMediaPayload>) {
    return this.http.patch<AdminEntityResponse>(
      `${this.baseUrl}/${entityId}/media/${linkId}`,
      data,
    );
  }

  ingestMedia(entityId: string, linkId: string) {
    return this.http.post<{ alreadyExisted?: boolean }>(
      `${this.baseUrl}/${entityId}/media/${linkId}/ingest`,
      {},
    );
  }

  promoteIngestedMedia(entityId: string, linkId: string) {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/${entityId}/media/${linkId}/promote`,
      {},
    );
  }

  restoreExternalMedia(entityId: string, linkId: string) {
    return this.http.post<{ ok: boolean }>(
      `${this.baseUrl}/${entityId}/media/${linkId}/restore-external`,
      {},
    );
  }

  deleteMedia(entityId: string, linkId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/media/${linkId}`);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${id}`);
  }

  listRelations(entityId: string) {
    return this.http.get<AdminEntityRelationRecord[]>(`${this.baseUrl}/${entityId}/relations`);
  }

  listIncomingRelations(entityId: string) {
    return this.http.get<AdminEntityRelationRecord[]>(
      `${this.baseUrl}/${entityId}/relations/incoming`,
    );
  }

  workspaceGraph(locale?: AdminLocale | string) {
    let params = new HttpParams();
    if (locale?.trim()) {
      params = params.set('locale', locale.trim());
    }

    return this.http.get<GraphResponseDto>(`${this.adminBaseUrl}/workspace/graph`, { params });
  }

  createSourceRef(entityId: string, data: AdminSourceRefPayload) {
    return this.http.post<AdminEntitySourceRefRecord>(
      `${this.baseUrl}/${entityId}/source-refs`,
      data,
    );
  }

  updateSourceRef(entityId: string, refId: string, data: Partial<AdminSourceRefPayload>) {
    return this.http.patch<AdminEntitySourceRefRecord>(
      `${this.baseUrl}/${entityId}/source-refs/${refId}`,
      data,
    );
  }

  deleteSourceRef(entityId: string, refId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/source-refs/${refId}`);
  }

  createContributor(entityId: string, data: AdminContributorPayload) {
    return this.http.post<AdminEntityContributorRecord>(
      `${this.baseUrl}/${entityId}/contributors`,
      data,
    );
  }

  updateContributor(
    entityId: string,
    contributorId: string,
    data: Partial<AdminContributorPayload>,
  ) {
    return this.http.patch<AdminEntityContributorRecord>(
      `${this.baseUrl}/${entityId}/contributors/${contributorId}`,
      data,
    );
  }

  deleteContributor(entityId: string, contributorId: string) {
    return this.http.delete<{ ok: boolean }>(
      `${this.baseUrl}/${entityId}/contributors/${contributorId}`,
    );
  }

  createRelation(entityId: string, data: AdminCreateRelationPayload) {
    return this.http.post<AdminEntityRelationRecord>(`${this.baseUrl}/${entityId}/relations`, data);
  }

  updateRelation(entityId: string, relationId: string, data: AdminUpdateRelationPayload) {
    return this.http.patch<AdminEntityRelationRecord>(
      `${this.baseUrl}/${entityId}/relations/${relationId}`,
      data,
    );
  }

  deleteRelation(entityId: string, relationId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}/relations/${relationId}`);
  }
}
