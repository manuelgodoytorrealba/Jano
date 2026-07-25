import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SearchSourcesQuery } from './dto/search-sources.query';
import { SourcesService } from './sources.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('sources')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}

  @Get()
  search(@Query() query: SearchSourcesQuery) {
    return this.service.search(query);
  }
}
