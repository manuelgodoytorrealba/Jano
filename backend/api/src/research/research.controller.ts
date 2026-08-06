import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { AssociateResearchLibraryMaterialDto } from './dto/associate-research-library-material.dto';
import { CreateResearchClaimDto, SetResearchClaimStatusDto } from './dto/create-research-claim.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchLibraryExcerptDto } from './dto/create-research-library-excerpt.dto';
import { CreateLibraryMaterialDto } from '../library/dto/create-library-material.dto';
import { CreateResearchPdfMaterialDto } from './dto/create-research-pdf-material.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { UpdateResearchProjectStatusDto } from './dto/update-research-project-status.dto';
import { CreateResearchOutlineSectionDto } from './dto/create-research-outline-section.dto';
import { CreateResearchQuestionDto } from './dto/create-research-question.dto';
import { AddResearchOutlineSectionMaterialDto } from './dto/add-research-outline-section-material.dto';
import { ResearchKnowledgeQuery } from './dto/research-knowledge.query';
import { UpdateResearchQuestionDto } from './dto/update-research-question.dto';
import { ReorderResearchOutlineSectionsDto } from './dto/reorder-research-outline-sections.dto';
import { ReorderResearchQuestionsDto } from './dto/reorder-research-questions.dto';
import { UpdateResearchOutlineSectionDto } from './dto/update-research-outline-section.dto';
import { ReviewResearchProposalDto } from './dto/review-research-proposal.dto';
import { CreateResearchEntityDto } from './dto/create-research-entity.dto';
import { CreateResearchRelationDto } from './dto/create-research-relation.dto';
import { SearchSourcesQuery } from '../sources/dto/search-sources.query';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchDraftService } from './research-draft.service';
import {
  CreateResearchDraftDto,
  CreateResearchDraftRevisionDto,
} from './dto/create-research-draft.dto';
import {
  RESEARCH_PDF_UPLOAD_OPTIONS,
  type UploadedResearchPdf,
} from './research-pdf-upload.config';
import { ResearchService } from './research.service';
import { AskResearchAssistantDto } from './dto/ask-research-assistant.dto';
import { ResearchSectionAssistantService } from './research-section-assistant.service';
import { unlink } from 'fs/promises';
import { MEDIA_IMAGE_UPLOAD_OPTIONS } from '../media/image-upload.config';
import type { UploadedImageFile } from '../media/entity-media.service';

import { ResearchOwnerGuard } from './research-owner.guard';
@UseGuards(JwtAuthGuard, RolesGuard, ResearchOwnerGuard)
@Roles('ADMIN')
@Controller('research')
export class ResearchController {
  constructor(
    private readonly service: ResearchService,
    private readonly jobRunner: ResearchJobRunnerService,
    private readonly drafts: ResearchDraftService,
    private readonly assistant: ResearchSectionAssistantService,
  ) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.service.listProjects(req.user.userId);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateResearchProjectDto) {
    return this.service.createProject(req.user.userId, dto);
  }

  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file', MEDIA_IMAGE_UPLOAD_OPTIONS))
  async uploadProjectCover(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    try {
      return await this.service.uploadProjectCover(id, file);
    } catch (error) {
      if (file?.path) await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Delete(':id/cover')
  clearProjectCover(@Param('id') id: string) {
    return this.service.clearProjectCover(id);
  }

  @Get('studio/status')
  status() {
    return this.service.getStudioStatus();
  }

  @Get('sources')
  searchSources(@Query() query: SearchSourcesQuery) {
    return this.service.searchSources(query);
  }

  @Post('jobs/run-next')
  runNextJob() {
    return this.jobRunner.runNextQueuedJob();
  }

  @Get(':id/knowledge')
  knowledge(@Param('id') id: string, @Query() query: ResearchKnowledgeQuery) {
    return this.service.getKnowledge(id, query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  @Post(':id/archive')
  archive(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.archiveProject(id, req.user.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateResearchProjectStatusDto,
  ) {
    return this.service.updateProjectStatus(id, req.user.userId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.deleteProject(id);
  }

  @Post(':id/outline/sections')
  createOutlineSection(@Param('id') id: string, @Body() dto: CreateResearchOutlineSectionDto) {
    return this.service.createOutlineSection(id, dto);
  }

  @Patch(':id/outline/sections/:sectionId')
  updateOutlineSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateResearchOutlineSectionDto,
  ) {
    return this.service.updateOutlineSection(id, sectionId, dto);
  }

  @Post(':id/outline/sections/:sectionId/image')
  @UseInterceptors(FileInterceptor('file', MEDIA_IMAGE_UPLOAD_OPTIONS))
  async uploadOutlineSectionImage(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    try {
      return await this.service.uploadOutlineSectionImage(id, sectionId, file);
    } catch (error) {
      if (file?.path) await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Delete(':id/outline/sections/:sectionId/image')
  clearOutlineSectionImage(@Param('id') id: string, @Param('sectionId') sectionId: string) {
    return this.service.clearOutlineSectionImage(id, sectionId);
  }

  @Delete(':id/outline/sections/:sectionId')
  deleteOutlineSection(@Param('id') id: string, @Param('sectionId') sectionId: string) {
    return this.service.deleteOutlineSection(id, sectionId);
  }

  @Put(':id/outline/sections/order')
  reorderOutlineSections(@Param('id') id: string, @Body() dto: ReorderResearchOutlineSectionsDto) {
    return this.service.reorderOutlineSections(id, dto);
  }

  @Post(':id/outline/sections/:sectionId/questions')
  createQuestion(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateResearchQuestionDto,
  ) {
    return this.service.createQuestion(id, sectionId, dto);
  }

  @Get(':id/outline/sections/:sectionId/assistant')
  getSectionAssistant(@Param('id') id: string, @Param('sectionId') sectionId: string) {
    return this.assistant.get(id, sectionId);
  }

  @Post(':id/outline/sections/:sectionId/assistant/suggestions')
  suggestForSection(@Param('id') id: string, @Param('sectionId') sectionId: string) {
    return this.assistant.suggest(id, sectionId);
  }

  @Post(':id/outline/sections/:sectionId/assistant/messages')
  askSectionAssistant(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: AskResearchAssistantDto,
  ) {
    return this.assistant.ask(id, sectionId, dto.message, dto.conversationStartedAt);
  }

  @Post(':id/outline/sections/:sectionId/materials')
  addOutlineSectionMaterial(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: AddResearchOutlineSectionMaterialDto,
  ) {
    return this.service.addOutlineSectionMaterial(id, sectionId, dto);
  }

  @Delete(':id/outline/sections/:sectionId/materials/:materialVersionId')
  removeOutlineSectionMaterial(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('materialVersionId') materialVersionId: string,
  ) {
    return this.service.removeOutlineSectionMaterial(id, sectionId, materialVersionId);
  }

  @Patch(':id/outline/sections/:sectionId/questions/:questionId')
  updateQuestion(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateResearchQuestionDto,
  ) {
    return this.service.updateQuestion(id, sectionId, questionId, dto);
  }

  @Delete(':id/outline/sections/:sectionId/questions/:questionId')
  deleteQuestion(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.deleteQuestion(id, sectionId, questionId);
  }

  @Put(':id/outline/sections/:sectionId/questions/order')
  reorderQuestions(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderResearchQuestionsDto,
  ) {
    return this.service.reorderQuestions(id, sectionId, dto);
  }

  @Post(':id/outline/sections/:sectionId/drafts')
  createDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateResearchDraftDto,
  ) {
    return this.drafts.create(id, sectionId, req.user.userId, dto);
  }

  @Post(':id/drafts/:draftId/revisions')
  reviseDraft(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('draftId') draftId: string,
    @Body() dto: CreateResearchDraftRevisionDto,
  ) {
    return this.drafts.revise(id, draftId, req.user.userId, dto);
  }

  @Post(':id/sources')
  addSource(@Param('id') id: string, @Body() dto: AddResearchProjectSourceDto) {
    return this.service.addProjectSource(id, dto);
  }

  @Post(':id/library-materials')
  associateLibraryMaterial(
    @Param('id') id: string,
    @Body() dto: AssociateResearchLibraryMaterialDto,
  ) {
    return this.service.associateLibraryMaterial(id, dto);
  }

  @Delete(':id/library-materials/:materialId')
  removeLibraryMaterial(@Param('id') id: string, @Param('materialId') materialId: string) {
    return this.service.removeLibraryMaterial(id, materialId);
  }

  @Post(':id/materials')
  createMaterial(@Param('id') id: string, @Body() dto: CreateLibraryMaterialDto) {
    return this.service.createMaterial(id, dto);
  }

  @Post(':id/materials/:materialId/jobs/prepare')
  prepareMaterial(@Param('id') id: string, @Param('materialId') materialId: string) {
    return this.service.prepareMaterial(id, materialId);
  }

  @Post(':id/materials/pdf')
  @UseInterceptors(FileInterceptor('file', RESEARCH_PDF_UPLOAD_OPTIONS))
  createPdfMaterial(
    @Param('id') id: string,
    @UploadedFile() file: UploadedResearchPdf | undefined,
    @Body() dto: CreateResearchPdfMaterialDto,
  ) {
    return this.service.createPdfMaterial(id, file, dto);
  }

  @Post(':id/claims')
  createClaim(@Param('id') id: string, @Body() dto: CreateResearchClaimDto) {
    return this.service.createClaim(id, dto);
  }

  @Post(':id/claims/:claimId/status')
  setClaimStatus(
    @Param('id') id: string,
    @Param('claimId') claimId: string,
    @Body() dto: SetResearchClaimStatusDto,
  ) {
    return this.service.setClaimStatus(id, claimId, dto);
  }

  @Post(':id/sources/:sourceId/jobs/prepare')
  prepareSource(@Param('id') id: string, @Param('sourceId') sourceId: string) {
    return this.service.prepareSourceJob(id, sourceId);
  }

  @Post(':id/jobs/extract-proposals')
  extractProposals(@Param('id') id: string) {
    return this.service.extractProposalsJob(id);
  }

  @Post(':id/sources/:sourceId/jobs/extract-proposals')
  extractProposalsForSource(@Param('id') id: string, @Param('sourceId') sourceId: string) {
    return this.service.extractProposalsJob(id, sourceId);
  }

  @Post(':id/research-proposals/:proposalId/convert-to-claim')
  convertProposalToClaim(@Param('id') id: string, @Param('proposalId') proposalId: string) {
    return this.service.convertProposalToClaim(id, proposalId);
  }

  @Post(':id/research-proposals/:proposalId/review')
  reviewProposal(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body() dto: ReviewResearchProposalDto,
  ) {
    return this.service.reviewProposal(id, proposalId, dto);
  }

  @Post(':id/relations/:relationId/review')
  reviewRelation(
    @Param('id') id: string,
    @Param('relationId') relationId: string,
    @Body() dto: ReviewResearchProposalDto,
  ) {
    return this.service.reviewRelation(id, relationId, dto);
  }

  @Post(':id/relations')
  createRelation(@Param('id') id: string, @Body() dto: CreateResearchRelationDto) {
    return this.service.createRelation(id, dto);
  }

  @Post(':id/entities/:entityId/review')
  reviewEntity(
    @Param('id') id: string,
    @Param('entityId') entityId: string,
    @Body() dto: ReviewResearchProposalDto,
  ) {
    return this.service.reviewEntity(id, entityId, dto);
  }

  @Post(':id/entities')
  createEntity(@Param('id') id: string, @Body() dto: CreateResearchEntityDto) {
    return this.service.createEntity(id, dto);
  }

  @Post(':id/evidence')
  createEvidence(@Param('id') id: string, @Body() dto: CreateResearchEvidenceDto) {
    return this.service.createEvidence(id, dto);
  }
  @Post(':id/library-excerpts')
  createLibraryExcerpt(@Param('id') id: string, @Body() dto: CreateResearchLibraryExcerptDto) {
    return this.service.createLibraryExcerpt(id, dto);
  }
}
