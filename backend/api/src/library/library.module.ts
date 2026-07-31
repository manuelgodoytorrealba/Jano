import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LibraryService } from './library.service';

@Module({
  imports: [PrismaModule],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
