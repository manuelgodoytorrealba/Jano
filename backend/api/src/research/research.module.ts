import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ResearchController } from './research.controller';
import { ResearchAIService } from './research-ai.service';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';

@Module({
  imports: [PrismaModule, AIModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchJobRunnerService, ResearchAIService],
})
export class ResearchModule {}
