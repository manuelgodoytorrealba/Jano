import { Module } from '@nestjs/common';
import { DiscoveryModule } from '../discovery/discovery.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchIntentService } from './search-intent.service';
import { SearchQueryRepository } from './search-query.repository';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, DiscoveryModule],
  controllers: [SearchController],
  providers: [SearchService, SearchIntentService, SearchQueryRepository],
})
export class SearchModule {}
