import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { apiUrl } from './api-base';

export type ResearchProjectStatus = 'ACTIVE' | 'PAUSED' | 'READY_TO_DECIDE' | 'ARCHIVED';
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
  kind: 'PERSON' | 'WORK' | 'ABSTRACTION' | 'EVENT' | 'PLACE' | 'ORGANIZATION';
  title: string;
  evidenceIds: string[];
  summary?: string;
  canonicalEntityId?: string;
};

export type ReviewResearchProposalPayload = {
  reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>;
};

export type ResearchProjectSummary = {
  id: string;
  title: string;
  objective: string;
  scope: string | null;
  status: ResearchProjectStatus;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
};

export type ResearchLibraryExcerpt = {
  id: string;
  locator: string;
  text: string;
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
  projectId: string;
  fromEntity?: { id: string; title: string; kind: string };
  toEntity?: { id: string; title: string; kind: string };
  fromEntityId: string;
  toEntityId: string;
  relationTypeId: string | null;
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
  evidence?: ResearchEntityEvidence[];
  kind: string;
  title: string;
  summary: string | null;
  confidence: number | null;
  mentionCount: number;
  reviewState: ResearchProposalReviewState;
  createdAt: string;
  updatedAt: string;
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
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ResearchQuestion = {
  id: string;
  sectionId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ResearchOutlineSectionExcerpt = {
  sectionId: string;
  libraryExcerptId: string;
  sortOrder: number;
  createdAt: string;
  libraryExcerpt: ResearchLibraryExcerpt;
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
  questions: ResearchQuestion[];
  excerptReferences: ResearchOutlineSectionExcerpt[];
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
  evidence: ResearchEvidence[];
  entities?: ResearchEntity[];
  relations?: ResearchRelation[];
  aiExecutions: ResearchAIExecution[];
  decisions: ResearchDecision[];
  jobs: ResearchJob[];
  materials: ResearchDocument[];
  claims: ResearchClaim[];
  outlineSections: ResearchOutlineSection[];
};

export type RunResearchJobResult =
  | { processed: false }
  | { processed: true; jobId: string; status: ResearchJobStatus };

@Injectable({ providedIn: 'root' })
export class ResearchApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/research');

  list() {
    return this.http.get<ResearchProjectSummary[]>(this.baseUrl);
  }

  searchSources(q: string, limit = 8) {
    return this.http.get<ResearchSourceRecord[]>(`${this.baseUrl}/sources`, {
      params: { q, limit },
    });
  }

  getKnowledge(projectId: string, request: ResearchKnowledgeRequest = {}) {
    let params = new HttpParams();
    if (request.scope) params = params.set('scope', request.scope);
    if (request.focusType) params = params.set('focusType', request.focusType);
    if (request.focusId) params = params.set('focusId', request.focusId);
    return this.http.get<ResearchKnowledge>(`${this.baseUrl}/${projectId}/knowledge`, {
      params,
    });
  }

  getById(id: string) {
    return this.http.get<ResearchProject>(`${this.baseUrl}/${id}`).pipe(
      map((project) => ({
        ...project,
        materials: project.materials ?? [],
        knowledge: project.knowledge,
        outlineSections: project.outlineSections ?? [],
        claims: project.claims ?? [],
        entities: project.entities ?? [],
        relations: project.relations ?? [],
      })),
    );
  }

  createOutlineSection(projectId: string, data: CreateResearchOutlineSectionPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/outline/sections`, data);
  }

  updateOutlineSection(
    projectId: string,
    sectionId: string,
    data: UpdateResearchOutlineSectionPayload,
  ) {
    return this.http.patch<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}`,
      data,
    );
  }

  reorderOutlineSections(projectId: string, parentSectionId: string | null, sectionIds: string[]) {
    return this.http.put<ResearchProject>(`${this.baseUrl}/${projectId}/outline/sections/order`, {
      ...(parentSectionId ? { parentSectionId } : {}),
      sectionIds,
    });
  }

  create(data: ResearchProjectPayload) {
    return this.http.post<ResearchProjectSummary>(this.baseUrl, data);
  }

  addOutlineSectionExcerpt(projectId: string, sectionId: string, libraryExcerptId: string) {
    return this.http.post<ResearchProject>(
      this.baseUrl + '/' + projectId + '/outline/sections/' + sectionId + '/library-excerpts',
      { libraryExcerptId },
    );
  }

  removeOutlineSectionExcerpt(projectId: string, sectionId: string, libraryExcerptId: string) {
    return this.http.delete<ResearchProject>(
      this.baseUrl +
        '/' +
        projectId +
        '/outline/sections/' +
        sectionId +
        '/library-excerpts/' +
        libraryExcerptId,
    );
  }

  createQuestion(projectId: string, sectionId: string, text: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/questions`,
      { text },
    );
  }

  updateQuestion(projectId: string, sectionId: string, questionId: string, text: string) {
    return this.http.patch<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/questions/${questionId}`,
      { text },
    );
  }

  deleteQuestion(projectId: string, sectionId: string, questionId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/questions/${questionId}`,
    );
  }

  reorderQuestions(projectId: string, sectionId: string, questionIds: string[]) {
    return this.http.put<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/questions/order`,
      { questionIds },
    );
  }

  addSource(projectId: string, data: AddResearchProjectSourcePayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/sources`, data);
  }

  createMaterial(projectId: string, data: CreateResearchDocumentPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/materials`, data);
  }

  createPdfMaterial(projectId: string, file: File, title?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (title?.trim()) formData.append('title', title.trim());
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/materials/pdf`, formData);
  }

  createClaim(projectId: string, data: CreateResearchClaimPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/claims`, data);
  }

  setClaimStatus(projectId: string, claimId: string, status: ResearchClaimStatus) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/claims/${claimId}/status`,
      { status },
    );
  }

  prepareSource(projectId: string, sourceId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/sources/${sourceId}/jobs/prepare`,
      {},
    );
  }

  runNextJob() {
    return this.http.post<RunResearchJobResult>(`${this.baseUrl}/jobs/run-next`, {});
  }

  createLibraryExcerpt(projectId: string, data: CreateResearchLibraryExcerptPayload) {
    return this.http.post<ResearchLibraryExcerptReference>(
      this.baseUrl + '/' + projectId + '/library-excerpts',
      data,
    );
  }

  createEvidence(projectId: string, data: CreateResearchEvidencePayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/evidence`, data);
  }

  reviewProposal(projectId: string, proposalId: string, data: ReviewResearchProposalPayload) {
    return this.http.post<ResearchProject>(`//research-proposals//review`, data);
  }

  convertProposalToClaim(projectId: string, proposalId: string) {
    return this.http.post<ResearchProject>(`//research-proposals//convert-to-claim`, {});
  }

  createRelation(projectId: string, data: CreateResearchRelationPayload) {
    return this.http.post<ResearchProject>(this.baseUrl + '/' + projectId + '/relations', data);
  }

  createEntity(projectId: string, data: CreateResearchEntityPayload) {
    return this.http.post<ResearchProject>(this.baseUrl + '/' + projectId + '/entities', data);
  }

  reviewRelation(
    projectId: string,
    relationId: string,
    reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>,
  ) {
    return this.http.post<ResearchProject>(
      this.baseUrl + '/' + projectId + '/relations/' + relationId + '/review',
      { reviewState },
    );
  }

  reviewEntity(
    projectId: string,
    entityId: string,
    reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>,
  ) {
    return this.http.post<ResearchProject>(
      this.baseUrl + '/' + projectId + '/entities/' + entityId + '/review',
      { reviewState },
    );
  }
}
