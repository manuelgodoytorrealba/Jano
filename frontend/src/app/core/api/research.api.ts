import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { apiUrl } from './api-base';

export type ResearchProjectStatus = 'ACTIVE' | 'PAUSED' | 'READY_TO_DECIDE' | 'ARCHIVED';
export type ResearchFindingStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'POSTPONED';
export type ResearchProposalReviewState = 'PENDING' | 'REVIEWED' | 'REJECTED';
export type ResearchDecisionAction = 'INCORPORATE' | 'REJECT' | 'POSTPONE';
export type ResearchJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type ResearchJobType = 'PREPARE_SOURCE' | 'EXTRACT_FINDINGS';
export type ResearchMaterialKind = 'TEXT' | 'URL' | 'PDF';
export type ResearchMaterialStatus = 'READY' | 'PENDING_PREPARATION' | 'FAILED';
export type ResearchClaimKind =
  | 'SUBJECT_CANDIDATE'
  | 'CONNECTION_HYPOTHESIS'
  | 'CONCEPT'
  | 'CONTRADICTION'
  | 'OPEN_QUESTION'
  | 'SYNTHESIS_STATEMENT';

export type ResearchProjectPayload = {
  title: string;
  objective: string;
  scope?: string;
};

export type CreateResearchMaterialPayload = {
  kind: Extract<ResearchMaterialKind, 'TEXT' | 'URL'>;
  title: string;
  content?: string;
  url?: string;
};

export type CreateResearchClaimPayload = {
  kind: ResearchClaimKind;
  title: string;
  summary?: string;
  evidenceIds: string[];
  subjectClaimId?: string;
  objectClaimId?: string;
  readyForPromotion?: boolean;
};

export type AddResearchProjectSourcePayload = {
  sourceId: string;
  note?: string;
};

export type CreateResearchEvidencePayload = {
  sourceId: string;
  sourceVersion: string;
  locator: string;
  quote: string;
  context?: string;
  note?: string;
};

export type CreateResearchFindingPayload = {
  title: string;
  kind?: string;
  summary?: string;
  evidenceIds: string[];
};

export type CreateResearchDecisionPayload = {
  action: ResearchDecisionAction;
  note?: string;
};

export type ReviewResearchFindingProposalPayload = {
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
    findings: number;
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

export type ResearchEvidence = {
  id: string;
  projectId: string;
  sourceId: string;
  sourceVersion: string;
  locator: string;
  quote: string;
  context: string | null;
  note: string | null;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};

export type ResearchFinding = {
  id: string;
  projectId: string;
  title: string;
  kind: string | null;
  summary: string | null;
  status: ResearchFindingStatus;
  createdAt: string;
  updatedAt: string;
  evidence?: ResearchFindingEvidence[];
};

export type ResearchFindingEvidence = {
  findingId: string;
  evidenceId: string;
  evidence?: ResearchEvidence | null;
};

export type ResearchFindingProposal = {
  id: string;
  projectId: string;
  aiExecutionId: string;
  convertedFindingId: string | null;
  title: string;
  summary: string | null;
  kind: string | null;
  reviewState: ResearchProposalReviewState;
  createdAt: string;
  evidence?: ResearchFindingProposalEvidence[];
};

export type ResearchFindingProposalEvidence = {
  proposalId: string;
  evidenceId: string;
  evidence?: ResearchEvidence | null;
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

export type ResearchMaterial = {
  id: string;
  projectId: string;
  kind: ResearchMaterialKind;
  status: ResearchMaterialStatus;
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
  readyForPromotion: boolean;
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

export type ResearchProject = ResearchProjectSummary & {
  sources: ResearchProjectSource[];
  evidence: ResearchEvidence[];
  findings: ResearchFinding[];
  findingProposals: ResearchFindingProposal[];
  aiExecutions: ResearchAIExecution[];
  decisions: ResearchDecision[];
  jobs: ResearchJob[];
  materials: ResearchMaterial[];
  claims: ResearchClaim[];
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

  getById(id: string) {
    return this.http.get<ResearchProject>(`${this.baseUrl}/${id}`).pipe(
      map((project) => ({
        ...project,
        materials: project.materials ?? [],
        claims: project.claims ?? [],
      })),
    );
  }

  create(data: ResearchProjectPayload) {
    return this.http.post<ResearchProjectSummary>(this.baseUrl, data);
  }

  addSource(projectId: string, data: AddResearchProjectSourcePayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/sources`, data);
  }

  createMaterial(projectId: string, data: CreateResearchMaterialPayload) {
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

  setClaimReadiness(projectId: string, claimId: string, readyForPromotion: boolean) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/claims/${claimId}/readiness`,
      { readyForPromotion },
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

  createEvidence(projectId: string, data: CreateResearchEvidencePayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/evidence`, data);
  }

  createFinding(projectId: string, data: CreateResearchFindingPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/findings`, data);
  }

  reviewFindingProposal(
    projectId: string,
    proposalId: string,
    data: ReviewResearchFindingProposalPayload,
  ) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/finding-proposals/${proposalId}/review`,
      data,
    );
  }

  convertFindingProposalToFinding(projectId: string, proposalId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/finding-proposals/${proposalId}/convert-to-finding`,
      {},
    );
  }

  decideFinding(projectId: string, findingId: string, data: CreateResearchDecisionPayload) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/findings/${findingId}/decisions`,
      data,
    );
  }
}
