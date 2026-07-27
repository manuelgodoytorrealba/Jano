import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SourcesModule } from '../sources/sources.module';
import { CitationsModule } from '../citations/citations.module';
import { EntitiesModule } from '../entities/entities.module';
import { ResearchController } from './research.controller';
import { ResearchAIService } from './research-ai.service';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';
import { ResearchOutlineService } from './research-outline.service';

@Module({
  imports: [PrismaModule, AIModule, SourcesModule, EntitiesModule, CitationsModule],
  controllers: [ResearchController],
  providers: [ResearchOutlineService, ResearchService, ResearchJobRunnerService, ResearchAIService],
})
export class ResearchModule {}
