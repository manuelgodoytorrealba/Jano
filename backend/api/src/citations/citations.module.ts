import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';
@Module({
  imports: [PrismaModule],
  controllers: [CitationsController],
  providers: [CitationsService],
  exports: [CitationsService],
})
export class CitationsModule {}
