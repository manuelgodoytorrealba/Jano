import type { Response } from 'express';
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
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

  @Public()
  @Get(':slug/graph-thumbnail')
  async thumbnail(@Param('slug') slug: string, @Res() response: Response) {
    const path = await this.service.thumbnailBySlug(slug);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.sendFile(path);
  }

  @Public()
  @Get(':slug/graph')
  graph(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.service.graphBySlug(slug, locale);
  }
}
