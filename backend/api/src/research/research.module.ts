import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResearchController } from './research.controller';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchJobRunnerService],
})
export class ResearchModule {}
