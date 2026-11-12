import { SearchQueryRepository } from '../search/search-query.repository';
import { SearchIntentService } from '../search/search-intent.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { VisualSearchController } from './visual-search.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { VisualSearchService } from './visual-search.service';
@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60000, limit: 6 }])],
  controllers: [DiscoveryController, VisualSearchController],
  providers: [DiscoveryService, VisualSearchService, SearchQueryRepository, SearchIntentService],
  exports: [DiscoveryService, VisualSearchService],
})
export class DiscoveryModule {}
