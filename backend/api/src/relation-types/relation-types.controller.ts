import { Controller, Get, Query } from '@nestjs/common';
import { RelationTypesService } from './relation-types.service';

@Controller('relation-types')
export class RelationTypesController {
  constructor(private service: RelationTypesService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.service.list({ includeInactive: includeInactive === 'true' });
  }
}
