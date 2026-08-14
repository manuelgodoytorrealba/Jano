import { Controller, Get, Param } from '@nestjs/common';
import { ResearchService } from './research.service';
import { Public } from '../auth/public.decorator';

@Controller('public/research')
export class ResearchPublicController {
  constructor(private readonly research: ResearchService) {}

  @Public()
  @Get()
  list() {
    return this.research.listPublishedProjects();
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.research.getPublishedProject(id);
  }
}
