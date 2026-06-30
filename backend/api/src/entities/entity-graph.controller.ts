import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EntityGraphService } from './entity-graph.service';

@Controller('entities')
export class EntityGraphController {
  constructor(private readonly service: EntityGraphService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/workspace/graph')
  adminWorkspace(@Query('locale') locale?: string) {
    return this.service.adminWorkspaceGraph(locale);
  }

  @Get(':slug/graph')
  graph(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.service.graphBySlug(slug, locale);
  }
}
