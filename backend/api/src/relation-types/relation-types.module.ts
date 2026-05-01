import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RelationTypesController } from './relation-types.controller';
import { RelationTypesService } from './relation-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [RelationTypesController],
  providers: [RelationTypesService],
})
export class RelationTypesModule {}
