import { Module } from '@nestjs/common';
import { EntityReadController } from './entity-read.controller';
import { EntityReadService } from './entity-read.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EntityMediaController } from '../media/entity-media.controller';
import { EntityMediaService } from '../media/entity-media.service';
import { EntityGraphController } from './entity-graph.controller';
import { EntityGraphService } from './entity-graph.service';
import { EntityEditorialService } from './entity-editorial.service';
import { EntityEditorialController } from './entity-editorial.controller';
import { EntityTaxonomyService } from './entity-taxonomy.service';
import { EntityCreditsService } from './entity-credits.service';
import { EntityCatalogService } from './entity-catalog.service';
import { EntityMediaLifecycleService } from '../media/entity-media-lifecycle.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    EntityGraphController,
    EntityMediaController,
    EntityEditorialController,
    EntityReadController,
  ],
  providers: [
    EntityReadService,
    EntityCatalogService,
    EntityMediaService,
    EntityMediaLifecycleService,
    EntityGraphService,
    EntityEditorialService,
    EntityTaxonomyService,
    EntityCreditsService,
  ],
})
export class EntitiesModule {}
