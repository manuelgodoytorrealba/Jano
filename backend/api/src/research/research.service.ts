import { RecordEvidenceDecisionDto } from './dto/record-evidence-decision.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { AssociateResearchLibraryMaterialDto } from './dto/associate-research-library-material.dto';
import { CiteResearchItemDto } from './dto/cite-research-item.dto';
import { CreateResearchClaimDto, SetResearchClaimStatusDto } from './dto/create-research-claim.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchLibraryExcerptDto } from './dto/create-research-library-excerpt.dto';
import { CreateResearchEvidenceFromExcerptDto } from './dto/create-research-evidence-from-excerpt.dto';
import { UpdateResearchEvidenceDto } from './dto/update-research-evidence.dto';
import { UpdateResearchLibraryExcerptDto } from './dto/update-research-library-excerpt.dto';
import { CreateLibraryMaterialDto } from '../library/dto/create-library-material.dto';
import { CreateResearchPdfMaterialDto } from './dto/create-research-pdf-material.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectStatusDto } from './dto/update-research-project-status.dto';
import { ReviewResearchProposalDto } from './dto/review-research-proposal.dto';
import { ResearchProposalActionDto } from './dto/research-proposal-action.dto';
import { UpdateResearchProposalDto } from './dto/update-research-proposal.dto';
import { CreateResearchEntityDto } from './dto/create-research-entity.dto';
import { CreateResearchRelationDto } from './dto/create-research-relation.dto';
import { SearchSourcesQuery } from '../sources/dto/search-sources.query';
import { SourcesService } from '../sources/sources.service';
import type {
  ResearchKnowledgeFocusType,
  ResearchKnowledgeQuery,
} from './dto/research-knowledge.query';
import type { ListResearchProposalsQuery } from './dto/list-research-proposals.query';
import type { UploadedResearchPdf } from './research-pdf-upload.config';
import { CreateResearchOutlineSectionDto } from './dto/create-research-outline-section.dto';
import { AddResearchOutlineSectionExcerptDto } from './dto/add-research-outline-section-excerpt.dto';
import { CreateResearchQuestionDto } from './dto/create-research-question.dto';
import { UpdateResearchQuestionDto } from './dto/update-research-question.dto';
import { ReorderResearchOutlineSectionsDto } from './dto/reorder-research-outline-sections.dto';
import { ReorderResearchQuestionsDto } from './dto/reorder-research-questions.dto';
import { UpdateResearchOutlineSectionDto } from './dto/update-research-outline-section.dto';
import { ResearchOutlineService } from './research-outline.service';
import { AddResearchOutlineSectionMaterialDto } from './dto/add-research-outline-section-material.dto';
import type { UploadedImageFile } from '../media/entity-media.service';
import { buildPublicUploadUrl, resolveMediaPublicBaseUrl } from '../common/media-url.util';
import { ResearchEvidenceDecisionService } from './research-evidence-decision.service';
import { ResearchKnowledgeService } from './research-knowledge.service';
import { ResearchCitationService } from './research-citation.service';
import { ResearchMaterialLinkService } from './research-material-link.service';
import { ResearchJobQueueService } from './research-job-queue.service';
import { ResearchProposalReviewService } from './research-proposal-review.service';
import { ResearchProposalAcceptanceService } from './research-proposal-acceptance.service';
import { ResearchGraphManagementService } from './research-graph-management.service';
import { ResearchMaterialService } from './research-material.service';
import { ResearchEvidenceService } from './research-evidence.service';
import { ResearchProjectLifecycleService } from './research-project-lifecycle.service';
import { ResearchPublicationReadService } from './research-publication-read.service';
import { ResearchProjectReadService } from './research-project-read.service';
import { ResearchEvidencePromotionService } from './research-evidence-promotion.service';
import { ResearchGenerationStatusService } from './research-generation-status.service';

@Injectable()
export class ResearchService {
  private readonly mediaPublicBaseUrl = resolveMediaPublicBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL,
  );

  constructor(
    private readonly sources: SourcesService,
    private readonly outline: ResearchOutlineService,
    private readonly evidenceDecisions: ResearchEvidenceDecisionService,
    private readonly knowledgeReader: ResearchKnowledgeService,
    private readonly citations: ResearchCitationService,
    private readonly materialLinks: ResearchMaterialLinkService,
    private readonly jobQueue: ResearchJobQueueService,
    private readonly proposalReviews: ResearchProposalReviewService,
    private readonly proposalAcceptance: ResearchProposalAcceptanceService,
    private readonly graphManagement: ResearchGraphManagementService,
    private readonly materials: ResearchMaterialService,
    private readonly evidenceStore: ResearchEvidenceService,
    private readonly projectLifecycle: ResearchProjectLifecycleService,
    private readonly publicationReader: ResearchPublicationReadService,
    private readonly projectReader: ResearchProjectReadService,
    private readonly evidencePromotion: ResearchEvidencePromotionService,
    private readonly generationStatus: ResearchGenerationStatusService,
  ) {}

  async recordEvidenceDecision(
    projectId: string,
    reviewerId: string,
    dto: RecordEvidenceDecisionDto,
  ) {
    return this.evidenceDecisions.record(projectId, reviewerId, dto);
  }

  async readReviewDecisions(projectId: string, logicalReviewIds: string[] = []) {
    return this.evidenceDecisions.read(projectId, logicalReviewIds);
  }

  getStudioStatus() {
    return {
      status: 'ready',
      scope: 'editorial-research-studio',
    };
  }

  async listProposals(projectId: string, query: ListResearchProposalsQuery) {
    return this.proposalReviews.list(projectId, query);
  }

  promoteApprovedEvidenceToProposals(projectId: string, logicalReviewIds: string[]) {
    return this.evidencePromotion.promote(projectId, logicalReviewIds);
  }
  async getKnowledgeMapGeneration(projectId: string) {
    return this.generationStatus.get(projectId);
  }

  createProject(ownerId: string, dto: CreateResearchProjectDto) {
    return this.projectLifecycle.create(ownerId, dto);
  }

  async uploadProjectCover(projectId: string, file: UploadedImageFile | undefined) {
    if (!file?.mimetype.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten imágenes válidas');
    }

    await this.projectLifecycle.setCover(
      projectId,
      buildPublicUploadUrl(`media/${file.filename}`, this.mediaPublicBaseUrl),
    );
    return this.getProject(projectId);
  }

  async clearProjectCover(projectId: string) {
    await this.projectLifecycle.setCover(projectId, null);
    return this.getProject(projectId);
  }

  async createOutlineSection(projectId: string, dto: CreateResearchOutlineSectionDto) {
    await this.outline.create(projectId, dto);
    return this.getProject(projectId);
  }

  async updateOutlineSection(
    projectId: string,
    sectionId: string,
    dto: UpdateResearchOutlineSectionDto,
  ) {
    await this.outline.update(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async uploadOutlineSectionImage(
    projectId: string,
    sectionId: string,
    file: UploadedImageFile | undefined,
  ) {
    await this.outline.setImage(projectId, sectionId, file);
    return this.getProject(projectId);
  }

  async clearOutlineSectionImage(projectId: string, sectionId: string) {
    await this.outline.clearImage(projectId, sectionId);
    return this.getProject(projectId);
  }

  async deleteOutlineSection(projectId: string, sectionId: string) {
    await this.outline.delete(projectId, sectionId);
    return this.getProject(projectId);
  }

  async reorderOutlineSections(projectId: string, dto: ReorderResearchOutlineSectionsDto) {
    await this.outline.reorder(projectId, dto);
    return this.getProject(projectId);
  }

  async addOutlineSectionExcerpt(
    projectId: string,
    sectionId: string,
    dto: AddResearchOutlineSectionExcerptDto,
  ) {
    await this.outline.addExcerpt(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async removeOutlineSectionExcerpt(
    projectId: string,
    sectionId: string,
    libraryExcerptId: string,
  ) {
    await this.outline.removeExcerpt(projectId, sectionId, libraryExcerptId);
    return this.getProject(projectId);
  }

  async addOutlineSectionMaterial(
    projectId: string,
    sectionId: string,
    dto: AddResearchOutlineSectionMaterialDto,
  ) {
    await this.outline.addMaterial(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async removeOutlineSectionMaterial(
    projectId: string,
    sectionId: string,
    materialVersionId: string,
  ) {
    await this.outline.removeMaterial(projectId, sectionId, materialVersionId);
    return this.getProject(projectId);
  }

  async createQuestion(projectId: string, sectionId: string, dto: CreateResearchQuestionDto) {
    await this.outline.createQuestion(projectId, sectionId, dto);
    return this.getProject(projectId);
  }
  async updateQuestion(
    projectId: string,
    sectionId: string,
    questionId: string,
    dto: UpdateResearchQuestionDto,
  ) {
    await this.outline.updateQuestion(projectId, sectionId, questionId, dto);
    return this.getProject(projectId);
  }
  async deleteQuestion(projectId: string, sectionId: string, questionId: string) {
    await this.outline.deleteQuestion(projectId, sectionId, questionId);
    return this.getProject(projectId);
  }

  async reorderQuestions(projectId: string, sectionId: string, dto: ReorderResearchQuestionsDto) {
    await this.outline.reorderQuestions(projectId, sectionId, dto);
    return this.getProject(projectId);
  }

  async listProjects(ownerId: string) {
    return this.projectLifecycle.listOwned(ownerId);
  }

  async listPublishedProjects() {
    return this.projectLifecycle.listPublished();
  }

  async getPublishedProject(id: string) {
    return this.publicationReader.get(id);
  }

  async publishProject(projectId: string) {
    await this.projectLifecycle.publish(projectId);
    return this.getProject(projectId);
  }

  searchSources(query: SearchSourcesQuery) {
    return this.sources.search(query);
  }

  async archiveProject(projectId: string, actorId: string) {
    await this.projectLifecycle.archive(projectId, actorId);
    return this.getProject(projectId);
  }

  async updateProjectStatus(
    projectId: string,
    actorId: string,
    dto: UpdateResearchProjectStatusDto,
  ) {
    await this.projectLifecycle.updateStatus(projectId, actorId, dto);
    return this.getProject(projectId);
  }

  async deleteProject(projectId: string) {
    return this.projectLifecycle.delete(projectId);
  }

  async getKnowledge(projectId: string, query: ResearchKnowledgeQuery = {}) {
    const scope = query.scope;
    if (!scope) return this.getCompleteKnowledge(projectId);
    if (scope === 'topology') return this.getTopologyKnowledge(projectId);

    if (!query.focusType || !query.focusId?.trim()) {
      throw new BadRequestException('Research Knowledge focusType and focusId are required');
    }

    const focus = { type: query.focusType, id: query.focusId.trim() };
    return scope === 'focus'
      ? this.getFocusedKnowledge(projectId, focus)
      : this.getTraceabilityKnowledge(projectId, focus);
  }

  private async getTopologyKnowledge(projectId: string) {
    return this.knowledgeReader.topology(projectId);
  }

  private getCompleteKnowledge(projectId: string) {
    return this.knowledgeReader.complete(projectId);
  }
  private getFocusedKnowledge(
    projectId: string,
    focus: { type: ResearchKnowledgeFocusType; id: string },
  ) {
    return this.knowledgeReader.focus(projectId, focus);
  }
  private getTraceabilityKnowledge(
    projectId: string,
    focus: { type: ResearchKnowledgeFocusType; id: string },
  ) {
    return this.knowledgeReader.traceability(projectId, focus);
  }
  async getProject(id: string) {
    return this.projectReader.get(id);
  }

  async addProjectSource(projectId: string, dto: AddResearchProjectSourceDto) {
    await this.materialLinks.addProjectSource(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async removeProjectSource(projectId: string, sourceId: string) {
    await this.materialLinks.removeProjectSource(projectId, sourceId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async addRelatedProject(projectId: string, relatedProjectId: string) {
    await this.materialLinks.addRelatedProject(projectId, relatedProjectId);
    return this.getProject(projectId);
  }

  async removeRelatedProject(projectId: string, relatedProjectId: string) {
    await this.materialLinks.removeRelatedProject(projectId, relatedProjectId);
    return this.getProject(projectId);
  }
  async citeResearchItem(projectId: string, dto: CiteResearchItemDto) {
    await this.citations.citeResearchItem(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async removeProjectCitation(projectId: string, citationId: string) {
    await this.citations.removeProjectCitation(projectId, citationId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async citeLibraryMaterial(projectId: string, materialId: string) {
    await this.citations.citeLibraryMaterial(projectId, materialId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }
  associateLibraryMaterial(projectId: string, dto: AssociateResearchLibraryMaterialDto) {
    return this.materialLinks.associateLibraryMaterial(projectId, dto);
  }

  async removeLibraryMaterial(projectId: string, materialId: string) {
    await this.materialLinks.removeLibraryMaterial(projectId, materialId);
    return this.getProject(projectId);
  }
  async prepareSourceJob(projectId: string, sourceId: string) {
    await this.jobQueue.prepareSourceJob(projectId, sourceId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async extractProposalsJob(projectId: string, sourceId?: string) {
    await this.jobQueue.extractProposalsJob(projectId, sourceId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }
  async reviewProposal(projectId: string, proposalId: string, dto: ReviewResearchProposalDto) {
    await this.proposalReviews.review(projectId, proposalId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  recordProposalReviewDecision(
    projectId: string,
    proposalId: string,
    reviewerId: string,
    logicalReviewId: string,
    evidenceDecisionId: string,
    approvedProposition: string,
  ) {
    return this.proposalReviews.recordProposalReviewDecision(
      projectId,
      proposalId,
      reviewerId,
      logicalReviewId,
      evidenceDecisionId,
      approvedProposition,
    );
  }
  async applyProposalAction(projectId: string, proposalId: string, dto: ResearchProposalActionDto) {
    const result = await this.proposalReviews.applyAction(projectId, proposalId, dto);
    return result === 'ACCEPT'
      ? this.acceptProposal(projectId, proposalId)
      : this.listProposals(projectId, { page: 1, limit: 100 });
  }
  async convertProposalToClaim(projectId: string, proposalId: string) {
    await this.proposalReviews.convertToClaim(projectId, proposalId);
    return this.getProject(projectId);
  }
  async updateProposal(projectId: string, proposalId: string, dto: UpdateResearchProposalDto) {
    await this.proposalReviews.update(projectId, proposalId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.listProposals(projectId, { page: 1, limit: 100 });
  }

  async acceptProposal(projectId: string, proposalId: string) {
    await this.proposalAcceptance.accept(projectId, proposalId);
    return this.getProject(projectId);
  }

  async mergeEntityProposal(projectId: string, proposalId: string, entityId: string) {
    await this.proposalAcceptance.mergeEntityProposal(projectId, proposalId, entityId);
    return this.getProject(projectId);
  }
  async reviewRelation(projectId: string, relationId: string, dto: ReviewResearchProposalDto) {
    await this.graphManagement.reviewRelation(projectId, relationId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async createRelation(projectId: string, dto: CreateResearchRelationDto) {
    await this.graphManagement.createRelation(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async reviewEntity(projectId: string, entityId: string, dto: ReviewResearchProposalDto) {
    await this.graphManagement.reviewEntity(projectId, entityId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async deleteEntity(projectId: string, entityId: string) {
    await this.graphManagement.deleteEntity(projectId, entityId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async createEntity(projectId: string, dto: CreateResearchEntityDto) {
    await this.graphManagement.createEntity(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async promoteEntity(projectId: string, entityId: string, canonicalType: string) {
    await this.graphManagement.promoteEntity(projectId, entityId, canonicalType);
    return this.getProject(projectId);
  }
  async prepareMaterial(projectId: string, materialId: string) {
    await this.materials.prepareMaterial(projectId, materialId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async createMaterial(projectId: string, dto: CreateLibraryMaterialDto) {
    await this.materials.createMaterial(projectId, dto);
    return this.getProject(projectId);
  }

  async createPdfMaterial(
    projectId: string,
    file: UploadedResearchPdf | undefined,
    dto: CreateResearchPdfMaterialDto,
  ) {
    await this.materials.createPdfMaterial(projectId, file, dto);
    return this.getProject(projectId);
  }
  async createClaim(projectId: string, dto: CreateResearchClaimDto) {
    await this.evidenceStore.createClaim(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async setClaimStatus(projectId: string, claimId: string, dto: SetResearchClaimStatusDto) {
    await this.evidenceStore.setClaimStatus(projectId, claimId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async createEvidence(projectId: string, dto: CreateResearchEvidenceDto) {
    await this.evidenceStore.createEvidence(projectId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  createLibraryExcerpt(projectId: string, dto: CreateResearchLibraryExcerptDto) {
    return this.evidenceStore.createLibraryExcerpt(projectId, dto);
  }

  async createEvidenceFromExcerpt(
    projectId: string,
    excerptId: string,
    dto: CreateResearchEvidenceFromExcerptDto = {},
  ) {
    await this.evidenceStore.createEvidenceFromExcerpt(projectId, excerptId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async deleteEvidence(projectId: string, evidenceId: string) {
    await this.evidenceStore.deleteEvidence(projectId, evidenceId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async updateEvidence(projectId: string, evidenceId: string, dto: UpdateResearchEvidenceDto) {
    await this.evidenceStore.updateEvidence(projectId, evidenceId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async deleteLibraryExcerpt(projectId: string, excerptId: string) {
    await this.evidenceStore.deleteLibraryExcerpt(projectId, excerptId);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }

  async updateLibraryExcerpt(
    projectId: string,
    excerptId: string,
    dto: UpdateResearchLibraryExcerptDto,
  ) {
    await this.evidenceStore.updateLibraryExcerpt(projectId, excerptId, dto);
    await this.projectLifecycle.touch(projectId);
    return this.getProject(projectId);
  }
}
