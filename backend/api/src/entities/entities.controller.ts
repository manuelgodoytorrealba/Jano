import { Controller, Get, Param } from '@nestjs/common';
import { EntitiesService } from './entities.service';

@Controller('entities')
export class EntitiesController {
  constructor(private service: EntitiesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(':slug/graph')
  graph(@Param('slug') slug: string) {
    return this.service.graphBySlug(slug);
  }
}