import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CanonicalAssertionService } from './canonical-assertion.service';
import { KnowledgeOperationsController } from './knowledge-operations.controller';
import { KnowledgeOperationsService } from './knowledge-operations.service';
import { SemanticResultCacheService } from './semantic-result-cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeOperationsController],
  providers: [CanonicalAssertionService, SemanticResultCacheService, KnowledgeOperationsService],
  exports: [CanonicalAssertionService, SemanticResultCacheService, KnowledgeOperationsService],
})
export class KnowledgeModule {}
