import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { LibraryModule } from '../library/library.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SourcesModule } from '../sources/sources.module';
import { ResearchController } from './research.controller';
import { ResearchAIService } from './research-ai.service';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';
import { ResearchOutlineService } from './research-outline.service';

import { ResearchOwnerGuard } from './research-owner.guard';
@Module({
  imports: [PrismaModule, AIModule, SourcesModule, LibraryModule],
  controllers: [ResearchController],
  providers: [
    ResearchOwnerGuard,
    ResearchOutlineService,
    ResearchService,
    ResearchJobRunnerService,
    ResearchAIService,
  ],
})
export class ResearchModule {}
