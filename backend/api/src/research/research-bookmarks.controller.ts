import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { ResearchBookmarksService } from './research-bookmarks.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class ResearchBookmarksController {
  constructor(private readonly bookmarks: ResearchBookmarksService) {}
  @Get('research-saved') list(@Req() req: AuthenticatedRequest) {
    return this.bookmarks.list(req.user.userId);
  }
  @Get('research-saved/check/:researchId') check(
    @Req() req: AuthenticatedRequest,
    @Param('researchId') id: string,
  ) {
    return this.bookmarks.check(req.user.userId, id);
  }
  @Post('research-saved/:researchId') save(
    @Req() req: AuthenticatedRequest,
    @Param('researchId') id: string,
  ) {
    return this.bookmarks.save(req.user.userId, id);
  }
  @Delete('research-saved/:researchId') remove(
    @Req() req: AuthenticatedRequest,
    @Param('researchId') id: string,
  ) {
    return this.bookmarks.remove(req.user.userId, id);
  }
  @Post('collections/:collectionId/research/:researchId') add(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('researchId') id: string,
  ) {
    return this.bookmarks.addToCollection(req.user.userId, collectionId, id);
  }
  @Delete('collections/:collectionId/research/:researchId') detach(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('researchId') id: string,
  ) {
    return this.bookmarks.removeFromCollection(req.user.userId, collectionId, id);
  }
}
