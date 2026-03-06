import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SavedController } from './saved.controller';
import { SavedService } from './saved.service';

@Module({
  imports: [PrismaModule],
  controllers: [SavedController],
  providers: [SavedService],
  exports: [SavedService],
})
export class SavedModule {}