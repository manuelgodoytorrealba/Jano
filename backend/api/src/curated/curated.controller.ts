import { Controller, Get, Query } from '@nestjs/common';
import { CuratedService } from './curated.service';

@Controller('curated')
export class CuratedController {
  constructor(private readonly service: CuratedService) {}

  @Get()
  page(@Query('entity') entity?: string, @Query('locale') locale?: string) {
    return this.service.page(entity, locale);
  }
}
