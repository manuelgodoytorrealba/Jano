import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeDecksController } from './home-decks.controller';
import { HomeDecksService } from './home-decks.service';

@Module({
  imports: [PrismaModule],
  controllers: [HomeDecksController],
  providers: [HomeDecksService],
})
export class HomeDecksModule {}
