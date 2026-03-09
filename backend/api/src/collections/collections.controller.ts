import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@UseGuards(JwtAuthGuard)
@Controller('me/collections')
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  @Get()
  list(@Req() req: any) {
    return this.collectionsService.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(req.user.userId, dto);
  }

  @Post(':collectionId/entities/:entityId')
  addEntity(
    @Req() req: any,
    @Param('collectionId') collectionId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.collectionsService.addEntity(req.user.userId, collectionId, entityId);
  }

  @Delete(':collectionId/entities/:entityId')
  removeEntity(
    @Req() req: any,
    @Param('collectionId') collectionId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.collectionsService.removeEntity(req.user.userId, collectionId, entityId);
  }
}