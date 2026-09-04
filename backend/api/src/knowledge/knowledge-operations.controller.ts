import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { KnowledgeOperationsService } from './knowledge-operations.service';

@Controller('knowledge-operations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class KnowledgeOperationsController {
  constructor(private readonly operations: KnowledgeOperationsService) {}

  @Get('snapshot')
  snapshot() {
    return this.operations.snapshot();
  }
}
