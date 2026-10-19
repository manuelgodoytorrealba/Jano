export type ResearchProjectStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'READY_TO_DECIDE'
  | 'PUBLISHED'
  | 'ARCHIVED';
export type ResearchProposalReviewState = 'PENDING' | 'REVIEWED' | 'REJECTED';
export type ResearchDecisionAction = 'INCORPORATE' | 'REJECT' | 'POSTPONE';
export type ResearchJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type ResearchJobType = 'PREPARE_SOURCE' | 'EXTRACT_FINDINGS';
export type ResearchDocumentKind = 'TEXT' | 'URL' | 'PDF';
export type ResearchDocumentStatus = 'READY' | 'PENDING_PREPARATION' | 'FAILED';
export type ResearchClaimKind =
  | 'ASSERTION'
  | 'CONNECTION_HYPOTHESIS'
  | 'CONCEPT'
  | 'CONTRADICTION'
  | 'OPEN_QUESTION'
  | 'SYNTHESIS_STATEMENT';
export type ResearchClaimStatus = 'DRAFT' | 'SUPPORTED' | 'QUESTIONED' | 'CONTRADICTED';
export type ResearchOutlineSectionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'COMPLETED';

export type ResearchProjectPayload = {
  title: string;
  objective: string;
  scope?: string;
};

export type CreateResearchDocumentPayload = {
  kind: Extract<ResearchDocumentKind, 'TEXT' | 'URL'>;
  title: string;
  content?: string;
  url?: string;
  author?: string;
  year?: number;
  sourceUrl?: string;
};

export type CreateResearchPdfMaterialPayload = {
  title?: string;
  author?: string;
  year?: number;
  sourceUrl?: string;
};

export type CreateResearchLibraryExcerptPayload = {
  materialVersionId: string;
  locator: string;
  text: string;
};

export type CreateResearchClaimPayload = {
  kind: ResearchClaimKind;
  title: string;
  summary?: string;
  evidenceIds: string[];
  subjectClaimId?: string;
  objectClaimId?: string;
};

export type AddResearchProjectSourcePayload = {
  sourceId: string;
  note?: string;
};

export type CreateResearchEvidencePayload = {
  sourceId: string;
  sourceVersion: string;
  locator: string;
  libraryExcerptId?: string;
  quote?: string;
  context?: string;
  note?: string;
};

export type CreateResearchRelationPayload = {
  fromEntityId: string;
  toEntityId: string;
  claimIds: string[];
  relationTypeId?: string;
  explanation?: string;
};

export type CreateResearchEntityPayload = {
  kind?: 'PERSON' | 'WORK' | 'ABSTRACTION' | 'EVENT' | 'PLACE' | 'ORGANIZATION';
  canonicalType?: string;
  title: string;
  evidenceIds: string[];
  summary?: string;
  canonicalEntityId?: string;
};

export type ResearchCanonicalEntityType = NonNullable<CreateResearchEntityPayload['canonicalType']>;

export type ReviewResearchProposalPayload = {
  reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>;
};

export type UpdateResearchProposalPayload = {
  title?: string;
  summary?: string;
  entityKind?: CreateResearchEntityPayload['kind'];
  claimKind?: ResearchClaimKind;
  relationTypeId?: string;
  explanation?: string;
};

export type ResearchProjectSummary = {
  id: string;
  title: string;
  objective: string;
  scope: string | null;
  coverImageUrl: string | null;
  status: ResearchProjectStatus;
  lastActiveAt: string;
  createdAt?: string;
  updatedAt: string;
  excerpts?: ResearchLibraryExcerptReference[];
  publishedAt?: string | null;
  _count?: {
    sources: number;
    evidence: number;
    materials: number;
    claims: number;
  };
};

export type ResearchSourceRecord = {
  id: string;
  type: string;
  title: string;
  author: string | null;
  publisher: string | null;
  year: number | null;
  url: string | null;
  createdAt?: string;
  translations?: Array<{
    locale: string;
    title: string;
    author: string | null;
    publisher: string | null;
  }>;
};

export type ResearchProjectSource = {
  projectId: string;
  sourceId: string;
  note: string | null;
  createdAt: string;
  source?: ResearchSourceRecord | null;
};

export type ResearchEvidenceExcerptStatus = 'NOT_LOADED' | 'AVAILABLE' | 'UNAVAILABLE';

export type ResearchSourceReference = Pick<
  ResearchSourceRecord,
  'id' | 'type' | 'title' | 'author' | 'publisher' | 'year' | 'url'
>;

export type ResearchLibraryExcerptReference = {
  id: string;
  locator: string;
  text: string;
  isHighlight: boolean;
  createdAt?: string;
  sourceId?: string | null;
};

export type ResearchLibraryExcerpt = {
  id: string;
  locator: string;
  text: string;
  isHighlight: boolean;
  materialVersion: {
    id: string;
    version: number;
    material: {
      id: string;
      title: string;
      source: ResearchSourceReference | null;
    };
  };
};

export type ResearchEvidence = {
  id: string;
  projectId: string;
  sourceId: string;
  sourceVersion: string;
  locator: string;
  libraryExcerptId: string | null;
  excerptStatus?: ResearchEvidenceExcerptStatus;
  source?: ResearchSourceReference;
  libraryExcerpt?: ResearchLibraryExcerpt | null;
  quote: string | null;
  context: string | null;
  note: string | null;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};
export type ResearchRelationClaim = {
  relationId: string;
  claimId: string;
  claim?: ResearchClaimReference & { status: ResearchClaimStatus };
};

export type ResearchRelation = {
  id: string;
  origin?: 'RESEARCH' | 'KNOWLEDGE_CORE';
  canonicalRelationId?: string | null;
  canonicalStatus?: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';
  projectId: string;
  fromEntity?: { id: string; title: string; kind: string };
  toEntity?: { id: string; title: string; kind: string };
  fromEntityId: string;
  toEntityId: string;
  relationTypeId: string | null;
  relationType?: { id: string; key: string; label: string } | null;
  explanation: string | null;
  claims?: ResearchRelationClaim[];
  confidence: number | null;
  reviewState: ResearchProposalReviewState;
  createdAt: string;
  updatedAt: string;
};

export type ResearchEntityEvidence = {
  entityId: string;
  evidenceId: string;
  evidence?: ResearchEvidence | null;
};

export type ResearchEntity = {
  id: string;
  projectId: string;
  canonicalEntityId?: string | null;
  canonicalEntity?: {
    id: string;
    title: string;
    type: string;
    kind: string | null;
    imageUrl: string | null;
  } | null;
  evidence?: ResearchEntityEvidence[];
  kind: string;
  title: string;
  aliases?: string[] | null;
  summary: string | null;
  confidence: number | null;
  mentionCount: number;
  reviewState: ResearchProposalReviewState;
  createdAt: string;
  updatedAt: string;
};

export type ResearchProposal = {
  id: string;
  projectId: string;
  jobId: string | null;
  type: 'LEGACY' | 'CLAIM' | 'ENTITY' | 'RELATION';
  proposalKey: string | null;
  title: string;
  summary: string | null;
  entityKind: string | null;
  relationFromKey: string | null;
  relationToKey: string | null;
  relationTypeId: string | null;
  relationType?: { id: string; key: string; label: string } | null;
  explanation: string | null;
  reviewState: ResearchProposalReviewState;
  convertedClaimId?: string | null;
  convertedEntityId?: string | null;
  convertedRelationId?: string | null;
  createdAt: string;
  evidence: Array<{ evidenceId: string; evidence: ResearchEvidence }>;
};

export type ResearchProposalPage = {
  items: ResearchProposal[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ResearchAIExecution = {
  id: string;
  task: string;
  provider: string;
  model: string;
  providerVersion: string | null;
  durationMs: number | null;
  costCents: number | null;
  error: string | null;
  createdAt: string;
  jobId: string | null;
};

export type ResearchDocument = {
  id: string;
  projectId: string;
  materialVersionId: string;
  sourceId: string | null;
  kind: ResearchDocumentKind;
  status: ResearchDocumentStatus;
  title: string;
  content: string | null;
  url: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  excerpts?: ResearchLibraryExcerptReference[];
};

export type ResearchClaimReference = {
  id: string;
  title: string;
  kind: ResearchClaimKind;
};

export type ResearchClaimEvidence = {
  claimId: string;
  evidenceId: string;
  evidence?: ResearchEvidence | null;
};
export type ResearchClaim = {
  id: string;
  projectId: string;
  kind: ResearchClaimKind;
  title: string;
  summary: string | null;
  subjectClaimId: string | null;
  objectClaimId: string | null;
  status: ResearchClaimStatus;
  createdAt: string;
  updatedAt: string;
  evidence?: ResearchClaimEvidence[];
  subject?: ResearchClaimReference | null;
  object?: ResearchClaimReference | null;
};

export type ResearchDecision = {
  id: string;
  projectId: string;
  findingId: string | null;
  actorId: string | null;
  action: ResearchDecisionAction;
  note: string | null;
  createdAt: string;
};

export type ResearchJob = {
  id: string;
  projectId: string;
  sourceId: string | null;
  type: ResearchJobType;
  status: ResearchJobStatus;
  inputFingerprint: string;
  attempts: number;
  maxAttempts: number;
  progressCurrent: number;
  progressTotal: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ResearchKnowledgeMapGeneration = {
  job: (ResearchJob & { _count: { findingProposals: number } }) | null;
  stale: boolean;
  canGenerate: boolean;
  preparedMaterials: number;
};

export type ResearchQuestion = {
  id: string;
  sectionId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ResearchDraftRevision = {
  id: string;
  draftId: string;
  authorId: string;
  number: number;
  content: string;
  createdAt: string;
};

export type ResearchDraft = {
  id: string;
  projectId: string;
  sectionId: string;
  title: string | null;
  workingContent?: string;
  currentRevisionId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentRevision: ResearchDraftRevision | null;
};

export type ResearchOutlineSectionExcerpt = {
  sectionId: string;
  libraryExcerptId: string;
  sortOrder: number;
  createdAt: string;
  libraryExcerpt: ResearchLibraryExcerpt;
};

export type ResearchOutlineSectionMaterial = {
  sectionId: string;
  materialVersionId: string;
  sortOrder: number;
  createdAt: string;
  materialVersion: {
    id: string;
    version: number;
    status: ResearchDocumentStatus;
    material: {
      id: string;
      title: string;
      kind: ResearchDocumentKind;
      source: ResearchSourceReference | null;
    };
    excerpts: Array<{
      id: string;
      locator: string;
      text: string;
    }>;
  };
};

export type ResearchSectionReviewTask = {
  kind: 'SELECT_EXCERPT' | 'CREATE_EVIDENCE' | 'CREATE_CLAIM' | 'REVIEW_CLAIM' | 'READY';
  title: string;
  claimId?: string;
};

export type ResearchSectionEditorialSummary = {
  excerptCount: number;
  evidenceCount: number;
  claimCount: number;
  supportedClaimCount: number;
  questionedClaimCount: number;
  contradictionCount: number;
  questionsWithoutExplicitSupport: ResearchQuestion[];
  state: {
    kind:
      | 'NEEDS_CORPUS'
      | 'NEEDS_EVIDENCE'
      | 'NEEDS_ARGUMENT'
      | 'HAS_TENSION'
      | 'NEEDS_REVIEW'
      | 'SUPPORTED';
    title: string;
    description: string;
  };
};

export type ResearchSectionDossier = {
  excerpts: ResearchLibraryExcerpt[];
  evidence: ResearchEvidence[];
  claims: ResearchClaim[];
  entities: ResearchEntity[];
  relations: ResearchRelation[];
  review: { nextTask: ResearchSectionReviewTask };
  summary: ResearchSectionEditorialSummary;
};

export type ResearchOutlineSection = {
  id: string;
  projectId: string;
  parentSectionId: string | null;
  title: string;
  status: ResearchOutlineSectionStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  objective: string | null;
  notes: string | null;
  imageUrl: string | null;
  questions: ResearchQuestion[];
  drafts: ResearchDraft[];
  excerptReferences: ResearchOutlineSectionExcerpt[];
  materialReferences: ResearchOutlineSectionMaterial[];
  dossier: ResearchSectionDossier;
};

export type CreateResearchOutlineSectionPayload = {
  title: string;
  parentSectionId?: string;
};

export type UpdateResearchOutlineSectionPayload = {
  title?: string;
  status?: ResearchOutlineSectionStatus;
  objective?: string;
  notes?: string;
};

export type ResearchKnowledgeScope = 'topology' | 'focus' | 'traceability' | 'complete';
export type ResearchKnowledgeFocusType = 'entity' | 'relation' | 'claim' | 'evidence';
export type ResearchKnowledgeLoadState = 'NOT_LOADED' | 'SUMMARY' | 'LOADED';

export type ResearchKnowledgeRequest = {
  scope?: Exclude<ResearchKnowledgeScope, 'complete'>;
  focusType?: ResearchKnowledgeFocusType;
  focusId?: string;
};

export type ResearchKnowledge = {
  scope: ResearchKnowledgeScope;
  focus: { type: ResearchKnowledgeFocusType; id: string } | null;
  expansions: {
    claims: ResearchKnowledgeLoadState;
    evidence: ResearchKnowledgeLoadState;
    traceability: ResearchKnowledgeLoadState;
  };
  projectId: string;
  entities: ResearchEntity[];
  relations: ResearchRelation[];
  claims: ResearchClaim[];
  contradictions: ResearchClaim[];
  supportingEvidence: ResearchEvidence[];
};

export type ResearchProject = ResearchProjectSummary & {
  knowledge: ResearchKnowledge;
  sources: ResearchProjectSource[];
  citations: ResearchProjectCitation[];
  evidence: ResearchEvidence[];
  entities?: ResearchEntity[];
  relations?: ResearchRelation[];
  aiExecutions: ResearchAIExecution[];
  decisions: ResearchDecision[];
  jobs: ResearchJob[];
  materials: ResearchDocument[];
  claims: ResearchClaim[];
  outlineSections: ResearchOutlineSection[];
  relatedProjects?: Array<{
    projectId: string;
    relatedProjectId: string;
    createdAt: string;
    relatedProject: Pick<
      ResearchProjectSummary,
      'id' | 'title' | 'objective' | 'coverImageUrl' | 'status'
    >;
  }>;
};

export type ResearchPublicPublication = {
  id: string;
  title: string;
  objective: string | null;
  scope: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  outlineSections: Array<{
    id: string;
    title: string;
    objective: string | null;
    notes: string | null;
    imageUrl: string | null;
    sortOrder: number;
    drafts: Array<{ title: string | null; currentRevision: { content: string } | null }>;
  }>;
  sources: Array<{ source: ResearchSourceReference }>;
  entities: Array<{
    id: string;
    title: string;
    kind: string;
    summary: string | null;
    canonicalEntity: {
      id: string;
      slug: string;
      title: string;
      type: string;
      imageUrl: string | null;
    } | null;
  }>;
  relations: Array<{
    id: string;
    relationType: { label: string; key?: string; directed?: boolean } | null;
    explanation?: string | null;
    fromEntity: { id: string; title: string; kind: string };
    toEntity: { id: string; title: string; kind: string };
  }>;
  related: Array<{ id: string; title: string; objective: string; coverImageUrl: string | null }>;
};

export type ResearchProjectCitation = {
  id: string;
  projectId: string;
  sourceId: string;
  materialId: string | null;
  libraryExcerptId: string | null;
  evidenceId: string | null;
  createdAt: string;
  material?: { title: string } | null;
  libraryExcerpt?: { locator: string; text: string } | null;
  evidence?: { locator: string; quote: string | null; context: string | null } | null;
};

export type ResearchAssistantSuggestion = {
  title: string;
  rationale: string;
  excerptIds: string[];
};

export type ResearchAssistantMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  snapshot: unknown;
  createdAt: string;
};

export type ResearchSectionAssistant = {
  threadId: string;
  provider: { provider: string; model: string; version?: string };
  messages: ResearchAssistantMessage[];
};

export type ResearchAssistantResponse = {
  message: ResearchAssistantMessage | null;
  output: { answer: string; suggestions: ResearchAssistantSuggestion[] };
  provider: { provider: string; model: string; version?: string };
};

export type RunResearchJobResult =
  | { processed: false }
  | { processed: true; jobId: string; status: ResearchJobStatus };
