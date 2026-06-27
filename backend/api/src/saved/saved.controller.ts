import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { SavedService } from './saved.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('me/saved')
export class SavedController {
  constructor(private savedService: SavedService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.savedService.listSaved(req.user.userId);
  }

  @Post(':entityId')
  save(@Req() req: AuthenticatedRequest, @Param('entityId') entityId: string) {
    return this.savedService.saveEntity(req.user.userId, entityId);
  }

  @Delete(':entityId')
  remove(@Req() req: AuthenticatedRequest, @Param('entityId') entityId: string) {
    return this.savedService.removeSaved(req.user.userId, entityId);
  }
  @Get('check/:entityId')
  check(@Req() req: AuthenticatedRequest, @Param('entityId') entityId: string) {
    return this.savedService.isSaved(req.user.userId, entityId);
  }
}
