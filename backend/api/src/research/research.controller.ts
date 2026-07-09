import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AddResearchProjectSourceDto } from './dto/add-research-project-source.dto';
import { CreateResearchDecisionDto } from './dto/create-research-decision.dto';
import { CreateResearchEvidenceDto } from './dto/create-research-evidence.dto';
import { CreateResearchFindingDto } from './dto/create-research-finding.dto';
import { CreateResearchProjectDto } from './dto/create-research-project.dto';
import { SearchResearchSourcesQuery } from './dto/search-research-sources.query';
import { ResearchService } from './research.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('research')
export class ResearchController {
  constructor(private readonly service: ResearchService) {}

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
  searchSources(@Query() query: SearchResearchSourcesQuery) {
    return this.service.searchSources(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  @Post(':id/sources')
  addSource(@Param('id') id: string, @Body() dto: AddResearchProjectSourceDto) {
    return this.service.addProjectSource(id, dto);
  }

  @Post(':id/sources/:sourceId/jobs/prepare')
  prepareSource(@Param('id') id: string, @Param('sourceId') sourceId: string) {
    return this.service.prepareSourceJob(id, sourceId);
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
