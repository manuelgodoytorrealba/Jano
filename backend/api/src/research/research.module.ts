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
import { CanonicalPromotionService } from './canonical-promotion.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
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

import { ResearchOwnerGuard } from './research-owner.guard';
@Module({
  imports: [PrismaModule, AIModule, SourcesModule, LibraryModule, EntitiesModule, KnowledgeModule],
  controllers: [ResearchController, ResearchPublicController],
  providers: [
    ResearchOwnerGuard,
    ResearchOutlineService,
    ResearchDraftService,
    ResearchSectionAssistantService,
    ResearchService,
    ResearchEvidenceDecisionService,
    ResearchKnowledgeService,
    ResearchCitationService,
    ResearchMaterialLinkService,
    ResearchJobQueueService,
    ResearchProposalReviewService,
    ResearchProposalAcceptanceService,
    ResearchGraphManagementService,
    ResearchMaterialService,
    ResearchEvidenceService,
    ResearchProjectLifecycleService,
    ResearchPublicationReadService,
    ResearchProjectReadService,
    ResearchEvidencePromotionService,
    ResearchGenerationStatusService,
    ResearchJobRunnerService,
    ResearchAIService,
    LibraryMaterialPreparationService,
    ReviewedResearchEvidenceService,
    CanonicalPromotionService,
  ],
})
export class ResearchModule {}
