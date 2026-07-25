import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomiesController } from './taxonomies.controller';
import { TaxonomiesService } from './taxonomies.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService],
})
export class TaxonomiesModule {}
