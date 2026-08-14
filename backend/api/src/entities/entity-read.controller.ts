import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { ListEntitiesQuery } from './dto/list-entities.query';
import { EntityReadService } from './entity-read.service';
import { EntityCatalogService } from './entity-catalog.service';

@Controller('entities')
export class EntityReadController {
  constructor(
    private readonly catalog: EntityCatalogService,
    private readonly service: EntityReadService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: ListEntitiesQuery) {
    return this.catalog.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  adminList(@Query() query: ListEntitiesQuery) {
    return this.catalog.adminList(query);
  }

  @Public()
  @Get('institutions')
  institutions() {
    return this.catalog.listInstitutions();
  }

  @Public()
  @Get('nationalities')
  nationalities() {
    return this.catalog.listNationalities();
  }

  @Public()
  @Get('home')
  home(@Query('locale') locale?: string) {
    return this.catalog.home(locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  adminGet(@Param('id') id: string) {
    return this.service.adminGetById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/preview/:slug')
  adminPreview(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.service.adminPreviewBySlug(slug, locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/relations')
  relations(@Param('id') id: string) {
    return this.service.adminListRelations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/relations/incoming')
  incomingRelations(@Param('id') id: string) {
    return this.service.adminListIncomingRelations(id);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.service.getBySlug(slug, locale);
  }

  @Public()
  @Get(':slug/preview')
  preview(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.service.previewBySlug(slug, locale);
  }
}
