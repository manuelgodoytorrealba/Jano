import { Controller, Get, Query } from '@nestjs/common';
import { CuratedService } from './curated.service';
import { Public } from '../auth/public.decorator';

@Controller('curated')
export class CuratedController {
  constructor(private readonly service: CuratedService) {}

  @Public()
  @Get()
  page(@Query('entity') entity?: string, @Query('locale') locale?: string) {
    return this.service.page(entity, locale);
  }
}
