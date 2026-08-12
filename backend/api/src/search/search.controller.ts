import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  OptionalAuthenticatedRequest,
} from '../auth/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArchiveRecommendationsQuery } from './dto/archive-recommendations.query';
import { SearchQuery } from './dto/search.query';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get('recommendations/archive')
  archiveRecommendations(
    @Query() query: ArchiveRecommendationsQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.archiveRecommendations(req.user.userId, query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  search(@Query() query: SearchQuery, @Req() req: OptionalAuthenticatedRequest) {
    const includeDrafts = query.includeDrafts === true && req.user?.role === 'ADMIN';
    return this.service.search(query, {
      includeDrafts,
      userId: query.recordInterest ? req.user?.userId : undefined,
    });
  }
}
