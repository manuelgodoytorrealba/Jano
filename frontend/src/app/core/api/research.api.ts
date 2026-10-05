import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { apiUrl } from './api-base';

import type {
  ResearchProjectStatus,
  ResearchProposalReviewState,
  ResearchClaimStatus,
  ResearchProjectPayload,
  CreateResearchDocumentPayload,
  CreateResearchPdfMaterialPayload,
  CreateResearchLibraryExcerptPayload,
  CreateResearchClaimPayload,
  AddResearchProjectSourcePayload,
  CreateResearchEvidencePayload,
  CreateResearchRelationPayload,
  CreateResearchEntityPayload,
  ResearchCanonicalEntityType,
  ReviewResearchProposalPayload,
  UpdateResearchProposalPayload,
  ResearchProjectSummary,
  ResearchSourceRecord,
  ResearchLibraryExcerptReference,
  ResearchProposalPage,
  ResearchKnowledgeMapGeneration,
  ResearchDraft,
  CreateResearchOutlineSectionPayload,
  UpdateResearchOutlineSectionPayload,
  ResearchKnowledgeRequest,
  ResearchKnowledge,
  ResearchProject,
  ResearchPublicPublication,
  ResearchSectionAssistant,
  ResearchAssistantResponse,
  RunResearchJobResult,
} from './research.models';
export * from './research.models';

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

  listProposals(
    projectId: string,
    options: { reviewState?: ResearchProposalReviewState; page?: number; limit?: number } = {},
  ) {
    let params = new HttpParams();
    if (options.reviewState) params = params.set('reviewState', options.reviewState);
    if (options.page) params = params.set('page', options.page);
    if (options.limit) params = params.set('limit', options.limit);
    return this.http.get<ResearchProposalPage>(`${this.baseUrl}/${projectId}/research-proposals`, {
      params,
    });
  }

  getById(id: string) {
    return this.http.get<ResearchProject>(`${this.baseUrl}/${id}`).pipe(
      map((project) => ({
        ...project,
        materials: project.materials ?? [],
        knowledge: project.knowledge,
        outlineSections: (project.outlineSections ?? []).map((section) => ({
          ...section,
          drafts: section.drafts ?? [],
          materialReferences: section.materialReferences ?? [],
        })),
        claims: project.claims ?? [],
        entities: project.entities ?? [],
        relations: project.relations ?? [],
      })),
    );
  }

  publish(projectId: string) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/publish`, {});
  }

  listPublished() {
    return this.http.get<ResearchProjectSummary[]>(apiUrl('/public/research'));
  }

  getPublished(id: string) {
    return this.http.get<ResearchPublicPublication>(apiUrl(`/public/research/${id}`));
  }

  createOutlineSection(projectId: string, data: CreateResearchOutlineSectionPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/outline/sections`, data);
  }

  uploadProjectCover(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/cover`, formData);
  }

  clearProjectCover(projectId: string) {
    return this.http.delete<ResearchProject>(`${this.baseUrl}/${projectId}/cover`);
  }

  getSectionAssistant(projectId: string, sectionId: string) {
    return this.http.get<ResearchSectionAssistant>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/assistant`,
    );
  }

  suggestForSection(projectId: string, sectionId: string) {
    return this.http.post<ResearchAssistantResponse>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/assistant/suggestions`,
      {},
    );
  }

  askSectionAssistant(
    projectId: string,
    sectionId: string,
    message: string,
    conversationStartedAt?: string,
  ) {
    return this.http.post<ResearchAssistantResponse>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/assistant/messages`,
      { message, conversationStartedAt },
    );
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

  uploadOutlineSectionImage(projectId: string, sectionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/image`,
      formData,
    );
  }

  clearOutlineSectionImage(projectId: string, sectionId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/image`,
    );
  }

  deleteOutlineSection(projectId: string, sectionId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}`,
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

  updateProjectStatus(projectId: string, status: ResearchProjectStatus) {
    return this.http.patch<ResearchProject>(`${this.baseUrl}/${projectId}/status`, { status });
  }

  deleteProject(projectId: string) {
    return this.http.delete<{ deleted: true }>(`${this.baseUrl}/${projectId}`);
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

  addOutlineSectionMaterial(projectId: string, sectionId: string, materialVersionId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/materials`,
      { materialVersionId },
    );
  }

  removeOutlineSectionMaterial(projectId: string, sectionId: string, materialVersionId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/materials/${materialVersionId}`,
    );
  }

  createQuestion(projectId: string, sectionId: string, text: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/questions`,
      { text },
    );
  }

  createDraft(projectId: string, sectionId: string, content: string) {
    return this.http.post<ResearchDraft>(
      `${this.baseUrl}/${projectId}/outline/sections/${sectionId}/drafts`,
      { content },
    );
  }

  saveDraftWorkingCopy(projectId: string, draftId: string, content: string) {
    return this.http.patch<ResearchDraft>(
      `${this.baseUrl}/${projectId}/drafts/${draftId}/working-copy`,
      {
        content,
      },
    );
  }

  reviseDraft(projectId: string, draftId: string, content: string) {
    return this.http.post<ResearchDraft>(
      `${this.baseUrl}/${projectId}/drafts/${draftId}/revisions`,
      { content },
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

  removeSource(projectId: string, sourceId: string) {
    return this.http.delete<ResearchProject>(`${this.baseUrl}/${projectId}/sources/${sourceId}`);
  }

  citeMaterial(projectId: string, materialId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/cited-materials/${materialId}`,
      {},
    );
  }

  citeResearchItem(
    projectId: string,
    kind: 'material' | 'excerpt' | 'evidence',
    itemId: string,
    sourceId?: string,
  ) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/citations`, {
      kind,
      itemId,
      sourceId,
    });
  }

  removeCitation(projectId: string, citationId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/citations/${citationId}`,
    );
  }

  addRelatedProject(projectId: string, relatedProjectId: string) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/related-projects`, {
      relatedProjectId,
    });
  }

  removeRelatedProject(projectId: string, relatedProjectId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/related-projects/${relatedProjectId}`,
    );
  }

  associateLibraryMaterial(projectId: string, materialId: string) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/library-materials`, {
      materialId,
    });
  }

  createMaterial(projectId: string, data: CreateResearchDocumentPayload) {
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/materials`, data);
  }

  removeMaterial(projectId: string, materialId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/library-materials/${materialId}`,
    );
  }

  createPdfMaterial(
    projectId: string,
    file: File,
    data: CreateResearchPdfMaterialPayload | string = {},
  ) {
    const metadata = typeof data === 'string' ? { title: data } : data;
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.title?.trim()) formData.append('title', metadata.title.trim());
    if (metadata.author?.trim()) formData.append('author', metadata.author.trim());
    if (metadata.year !== undefined) formData.append('year', String(metadata.year));
    if (metadata.sourceUrl?.trim()) formData.append('sourceUrl', metadata.sourceUrl.trim());
    return this.http.post<ResearchProject>(`${this.baseUrl}/${projectId}/materials/pdf`, formData);
  }

  prepareMaterial(projectId: string, materialId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/materials/${materialId}/jobs/prepare`,
      {},
    );
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

  generateKnowledgeMap(projectId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/jobs/extract-proposals`,
      {},
    );
  }

  getKnowledgeMapGeneration(projectId: string) {
    return this.http.get<ResearchKnowledgeMapGeneration>(
      `${this.baseUrl}/${projectId}/knowledge-map-generation`,
    );
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

  createEvidenceFromExcerpt(
    projectId: string,
    excerptId: string,
    data: { context: string; note?: string },
  ) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/library-excerpts/${excerptId}/evidence`,
      data,
    );
  }

  deleteEvidence(projectId: string, evidenceId: string) {
    return this.http.delete<ResearchProject>(`${this.baseUrl}/${projectId}/evidence/${evidenceId}`);
  }

  updateEvidence(projectId: string, evidenceId: string, data: { context?: string; note?: string }) {
    return this.http.patch<ResearchProject>(
      `${this.baseUrl}/${projectId}/evidence/${evidenceId}`,
      data,
    );
  }

  deleteLibraryExcerpt(projectId: string, excerptId: string) {
    return this.http.delete<ResearchProject>(
      `${this.baseUrl}/${projectId}/library-excerpts/${excerptId}`,
    );
  }

  updateLibraryExcerpt(
    projectId: string,
    excerptId: string,
    data: { locator: string; text: string },
  ) {
    return this.http.patch<ResearchProject>(
      `${this.baseUrl}/${projectId}/library-excerpts/${excerptId}`,
      data,
    );
  }

  reviewProposal(projectId: string, proposalId: string, data: ReviewResearchProposalPayload) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/research-proposals/${proposalId}/review`,
      data,
    );
  }

  convertProposalToClaim(projectId: string, proposalId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/research-proposals/${proposalId}/convert-to-claim`,
      {},
    );
  }

  updateProposal(projectId: string, proposalId: string, data: UpdateResearchProposalPayload) {
    return this.http.patch<ResearchProposalPage>(
      `${this.baseUrl}/${projectId}/research-proposals/${proposalId}`,
      data,
    );
  }

  acceptProposal(projectId: string, proposalId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/research-proposals/${proposalId}/accept`,
      {},
    );
  }

  mergeEntityProposal(projectId: string, proposalId: string, entityId: string) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/research-proposals/${proposalId}/merge`,
      { entityId },
    );
  }

  createRelation(projectId: string, data: CreateResearchRelationPayload) {
    return this.http.post<ResearchProject>(this.baseUrl + '/' + projectId + '/relations', data);
  }

  createEntity(projectId: string, data: CreateResearchEntityPayload) {
    return this.http.post<ResearchProject>(this.baseUrl + '/' + projectId + '/entities', data);
  }

  promoteEntity(projectId: string, entityId: string, canonicalType: ResearchCanonicalEntityType) {
    return this.http.post<ResearchProject>(
      `${this.baseUrl}/${projectId}/entities/${entityId}/promote`,
      { canonicalType },
    );
  }

  reviewRelation(projectId: string, relationId: string, reviewState: ResearchProposalReviewState) {
    return this.http.post<ResearchProject>(
      this.baseUrl + '/' + projectId + '/relations/' + relationId + '/review',
      { reviewState },
    );
  }

  reviewEntity(projectId: string, entityId: string, reviewState: ResearchProposalReviewState) {
    return this.http.post<ResearchProject>(
      this.baseUrl + '/' + projectId + '/entities/' + entityId + '/review',
      { reviewState },
    );
  }

  deleteEntity(projectId: string, entityId: string) {
    return this.http.delete<ResearchProject>(`${this.baseUrl}/${projectId}/entities/${entityId}`);
  }
}
