import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SearchQuery } from './dto/search.query';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  search(@Query() query: SearchQuery, @Req() req: any) {
    const includeDrafts = query.includeDrafts === true && req.user?.role === 'ADMIN';
    return this.service.search(query, { includeDrafts });
  }
}
