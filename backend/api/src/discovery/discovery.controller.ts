import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { DiscoveryQuery } from './discovery.query';
import { DiscoveryService } from './discovery.service';
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly service: DiscoveryService) {}
  @Public()
  @Get('facets')
  async facets(@Query() query: DiscoveryQuery) {
    const { ids: _ids, ...response } = await this.service.context(query);
    return response;
  }
}
