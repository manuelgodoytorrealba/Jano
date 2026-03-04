import { Controller, Get, Param, Query } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { ListEntitiesQuery } from './dto/list-entities.query';

@Controller('entities')
export class EntitiesController {
  constructor(private service: EntitiesService) {}

  @Get()
  list(@Query() query: ListEntitiesQuery) {
    return this.service.list(query);
  }

  // ✅ IMPORTANTE: antes de :slug
  @Get('home')
  home() {
    return this.service.home();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(':slug/graph')
  graph(@Param('slug') slug: string) {
    return this.service.graphBySlug(slug);
  }

  @Get(':slug/preview')
  preview(@Param('slug') slug: string) {
    return this.service.previewBySlug(slug);
  }
}