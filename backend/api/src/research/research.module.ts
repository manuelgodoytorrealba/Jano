import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { LibraryModule } from '../library/library.module';
import { EntitiesModule } from '../entities/entities.module';
import { LibraryMaterialPreparationService } from '../library/library-material-preparation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SourcesModule } from '../sources/sources.module';
import { ResearchController } from './research.controller';
import { ResearchPublicController } from './research-public.controller';
import { ResearchAIService } from './research-ai.service';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';
import { ResearchOutlineService } from './research-outline.service';
import { ResearchDraftService } from './research-draft.service';
import { ResearchSectionAssistantService } from './research-section-assistant.service';
import { ReviewedResearchEvidenceService } from './reviewed-research-evidence.service';

import { ResearchOwnerGuard } from './research-owner.guard';
@Module({
  imports: [PrismaModule, AIModule, SourcesModule, LibraryModule, EntitiesModule],
  controllers: [ResearchController, ResearchPublicController],
  providers: [
    ResearchOwnerGuard,
    ResearchOutlineService,
    ResearchDraftService,
    ResearchSectionAssistantService,
    ResearchService,
    ResearchJobRunnerService,
    ResearchAIService,
    LibraryMaterialPreparationService,
    ReviewedResearchEvidenceService,
  ],
})
export class ResearchModule {}
