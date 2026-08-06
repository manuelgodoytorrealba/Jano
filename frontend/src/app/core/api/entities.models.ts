export type PublicEntityType =
  | 'ARTWORK'
  | 'ARTICLE'
  | 'ARTIST'
  | 'MOVEMENT'
  | 'PERIOD'
  | 'CONCEPT'
  | 'PLACE'
  | 'TEXT'
  | 'EVENT'
  | 'ORGANIZATION'
  | string;

export type PublicKnowledgeEntityKind =
  | 'PERSON'
  | 'WORK'
  | 'ABSTRACTION'
  | 'EVENT'
  | 'PLACE'
  | 'ORGANIZATION'
  | string;

export interface PublicEntityMediaAsset {
  id?: string | null;
  url?: string | null;
  src?: string | null;
  alt?: string | null;
  role?: string | null;
  sortOrder?: number | null;
  isPrimary?: boolean | null;
  source?: string | null;
  photoBy?: string | null;
  license?: string | null;
  width?: number | null;
  height?: number | null;
  displayMode?: string | null;
  focalX?: number | null;
  focalY?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropZoom?: number | null;
}

export interface PublicEntityResolvedMedia {
  thumbnail?: PublicEntityMediaAsset | null;
  card?: PublicEntityMediaAsset | null;
  detail?: PublicEntityMediaAsset | null;
  hero?: PublicEntityMediaAsset | null;
  primary?: PublicEntityMediaAsset | null;
  gallery?: PublicEntityMediaAsset[] | null;
  [key: string]: PublicEntityMediaAsset | PublicEntityMediaAsset[] | null | undefined;
}

export interface PublicEntityRelationEndpoint {
  id: string;
  slug: string;
  title: string;
  type: string;
  kind?: PublicKnowledgeEntityKind | null;
  summary?: string | null;
}

export interface PublicEntityRelation {
  id?: string | null;
  type: string;
  relationTypeKey?: string | null;
  relationTypeLabel?: string | null;
  relationTypeInverseLabel?: string | null;
  relationType?: { key?: string | null; label?: string | null } | null;
  justification?: string | null;
  weight?: number | null;
  from: PublicEntityRelationEndpoint;
  to: PublicEntityRelationEndpoint;
}

export interface PublicEntityContributor {
  name?: string | null;
  role?: string | null;
}

export interface PublicEntityTagItem {
  id?: string | null;
  slug?: string | null;
  label?: string | null;
  category?: string | null;
}

export interface PublicEntityClassification {
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
}

export interface PublicEntityArtworkDetails {
  technique?: string | null;
  materials?: string | null;
  dimensions?: string | null;
  location?: string | null;
  collection?: string | null;
  state?: string | null;
  authorNation?: string | null;
}

export interface PublicEntityArtistDetails {
  country?: string | null;
  city?: string | null;
  birthYear?: string | number | null;
  deathYear?: string | number | null;
  disciplines?: string | null;
  links?: string | null;
  bioShort?: string | null;
}

export interface PublicEntityConceptDetails {
  definition?: string | null;
}

export interface PublicEntityPeriodDetails {
  definition?: string | null;
}

export interface PublicEntitySourceRef {
  id: string;
  source?: {
    type?: string | null;
    title?: string | null;
    author?: string | null;
    publisher?: string | null;
    year?: string | number | null;
  } | null;
  sourceType?: string | null;
  sourceTitle?: string | null;
  sourceAuthor?: string | null;
  sourcePublisher?: string | null;
  sourceYear?: string | number | null;
  title?: string | null;
  author?: string | null;
  year?: string | number | null;
  publisher?: string | null;
  url?: string | null;
  type?: string | null;
  page?: string | number | null;
  quote?: string | null;
  note?: string | null;
}

export interface PublicEntityCitation {
  id: string;
  stance: 'SUPPORTS' | 'CONTRADICTS' | 'MENTIONS' | string;
  locator?: string | null;
  quote?: string | null;
  source: {
    id: string;
    type: string;
    title: string;
    author?: string | null;
    publisher?: string | null;
    year?: number | null;
    url?: string | null;
  };
}

export interface PublicEntityAttribute {
  id: string;
  locale?: string | null;
  definition: {
    id: string;
    key: string;
    label: string;
    valueType: string;
    isMultiple: boolean;
  };
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  valueYear?: number | null;
  valueJson?: unknown;
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
  citations?: PublicEntityCitation[] | null;
}

export interface PublicEntityMediaLibrary {
  resolvedSlots?: Array<{
    slotKey?: string | null;
    item?: PublicEntityMediaAsset | null;
  }> | null;
}

export interface PublicEntityTagReference {
  tag?: PublicEntityTagItem | null;
  id?: string | null;
  slug?: string | null;
  label?: string | null;
}

export interface PublicEntityTranslationMeta {
  isFallback?: boolean;
  resolvedLocale?: string | null;
}

export interface PublicEntity {
  id: string;
  slug: string;
  title: string;
  type: PublicEntityType;
  kind?: PublicKnowledgeEntityKind | null;
  summary?: string | null;
  content?: string | null;
  status?: string | null;
  contentLevel?: string | null;
  createdAt?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  image?: string | null;
  artwork?: PublicEntityArtworkDetails | null;
  artist?: PublicEntityArtistDetails | null;
  concept?: PublicEntityConceptDetails | null;
  period?: PublicEntityPeriodDetails | null;
  contributors?: PublicEntityContributor[] | null;
  outgoing?: PublicEntityRelation[] | null;
  incoming?: PublicEntityRelation[] | null;
  tags?: PublicEntityTagReference[] | PublicEntityTagItem[] | null;
  classifications?: PublicEntityClassification[] | null;
  attributes?: PublicEntityAttribute[] | null;
  sourceRefs?: PublicEntitySourceRef[] | null;
  translationMeta?: PublicEntityTranslationMeta | null;
  mediaLinks?: Array<{ media?: PublicEntityMediaAsset | null; [key: string]: unknown }> | null;
  mediaLibrary?: PublicEntityMediaLibrary | null;
  resolvedMedia?: PublicEntityResolvedMedia | null;
}

export type PublicEntityListItem = PublicEntity;
export type PublicEntityPreview = PublicEntity;
export type PublicEntityDetail = PublicEntity;

export interface PublicEntityListResponse<TItem = PublicEntityListItem> {
  items: TItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
