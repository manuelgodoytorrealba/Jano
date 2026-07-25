import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import {
  CreateResearchClaimDto,
  SetResearchClaimReadinessDto,
} from './dto/create-research-claim.dto';
import { CreateResearchDecisionDto } from './dto/create-research-decision.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchFindingDto } from './dto/create-research-finding.dto';
import {
  CreateResearchMaterialDto,
  CreateResearchPdfMaterialDto,
} from './dto/create-research-material.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { ReviewResearchFindingProposalDto } from './dto/review-research-finding-proposal.dto';
import { PromoteResearchFindingDto } from './dto/promote-research-finding.dto';
import { CreateResearchEntityCandidateDto } from './dto/create-research-entity-candidate.dto';
import { CreateResearchRelationCandidateDto } from './dto/create-research-relation-candidate.dto';
import { SearchSourcesQuery } from '../sources/dto/search-sources.query';
import { ResearchJobRunnerService } from './research-job-runner.service';
import {
  RESEARCH_PDF_UPLOAD_OPTIONS,
  type UploadedResearchPdf,
} from './research-pdf-upload.config';
import { ResearchService } from './research.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('research')
export class ResearchController {
  constructor(
    private readonly service: ResearchService,
    private readonly jobRunner: ResearchJobRunnerService,
  ) {}

  @Get()
  list() {
    return this.service.listProjects();
  }

  @Post()
  create(@Body() dto: CreateResearchProjectDto) {
    return this.service.createProject(dto);
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

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  @Post(':id/sources')
  addSource(@Param('id') id: string, @Body() dto: AddResearchProjectSourceDto) {
    return this.service.addProjectSource(id, dto);
  }

  @Post(':id/materials')
  createMaterial(@Param('id') id: string, @Body() dto: CreateResearchMaterialDto) {
    return this.service.createMaterial(id, dto);
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

  @Post(':id/claims/:claimId/readiness')
  setClaimReadiness(
    @Param('id') id: string,
    @Param('claimId') claimId: string,
    @Body() dto: SetResearchClaimReadinessDto,
  ) {
    return this.service.setClaimReadiness(id, claimId, dto);
  }

  @Post(':id/sources/:sourceId/jobs/prepare')
  prepareSource(@Param('id') id: string, @Param('sourceId') sourceId: string) {
    return this.service.prepareSourceJob(id, sourceId);
  }

  @Post(':id/jobs/extract-findings')
  extractFindings(@Param('id') id: string) {
    return this.service.extractFindingsJob(id);
  }

  @Post(':id/sources/:sourceId/jobs/extract-findings')
  extractFindingsForSource(@Param('id') id: string, @Param('sourceId') sourceId: string) {
    return this.service.extractFindingsJob(id, sourceId);
  }

  @Post(':id/finding-proposals/:proposalId/convert-to-finding')
  convertFindingProposalToFinding(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.service.convertFindingProposalToFinding(id, proposalId);
  }

  @Post(':id/finding-proposals/:proposalId/review')
  reviewFindingProposal(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body() dto: ReviewResearchFindingProposalDto,
  ) {
    return this.service.reviewFindingProposal(id, proposalId, dto);
  }

  @Post(':id/relation-candidates/:candidateId/promote/relation')
  promoteRelationCandidate(@Param('id') id: string, @Param('candidateId') candidateId: string) {
    return this.service.promoteRelationCandidate(id, candidateId);
  }

  @Post(':id/relation-candidates/:candidateId/review')
  reviewRelationCandidate(
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: ReviewResearchFindingProposalDto,
  ) {
    return this.service.reviewRelationCandidate(id, candidateId, dto);
  }

  @Post(':id/relation-candidates')
  createRelationCandidate(
    @Param('id') id: string,
    @Body() dto: CreateResearchRelationCandidateDto,
  ) {
    return this.service.createRelationCandidate(id, dto);
  }

  @Post(':id/entity-candidates/:candidateId/promote/entity')
  promoteEntityCandidate(
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: PromoteResearchFindingDto,
  ) {
    return this.service.promoteEntityCandidate(id, candidateId, dto);
  }

  @Post(':id/entity-candidates/:candidateId/review')
  reviewEntityCandidate(
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: ReviewResearchFindingProposalDto,
  ) {
    return this.service.reviewEntityCandidate(id, candidateId, dto);
  }

  @Post(':id/entity-candidates')
  createEntityCandidate(@Param('id') id: string, @Body() dto: CreateResearchEntityCandidateDto) {
    return this.service.createEntityCandidate(id, dto);
  }

  @Post(':id/findings/:findingId/promote/entity')
  promoteFindingToEntity(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: PromoteResearchFindingDto,
  ) {
    return this.service.promoteFindingToEntity(id, findingId, dto);
  }

  @Post(':id/evidence')
  createEvidence(@Param('id') id: string, @Body() dto: CreateResearchEvidenceDto) {
    return this.service.createEvidence(id, dto);
  }

  @Post(':id/findings')
  createFinding(@Param('id') id: string, @Body() dto: CreateResearchFindingDto) {
    return this.service.createFinding(id, dto);
  }

  @Post(':id/findings/:findingId/decisions')
  decideFinding(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: CreateResearchDecisionDto,
  ) {
    return this.service.decideFinding(id, findingId, req.user.userId, dto);
  }
}
