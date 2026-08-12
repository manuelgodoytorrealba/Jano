import { Controller, Get } from '@nestjs/common';
import { ResearchService } from './research.service';

@Controller('public/research')
export class ResearchPublicController {
  constructor(private readonly research: ResearchService) {}

  @Get()
  list() {
    return this.research.listPublishedProjects();
  }
}
