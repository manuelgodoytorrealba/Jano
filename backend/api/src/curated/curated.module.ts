import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CuratedController } from './curated.controller';
import { CuratedService } from './curated.service';

@Module({
  imports: [PrismaModule],
  controllers: [CuratedController],
  providers: [CuratedService],
})
export class CuratedModule {}
