import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { ReorderCollectionItemDto } from './dto/reorder-collection-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('me/collections')
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.collectionsService.list(req.user.userId);
  }

  @Get(':collectionId')
  getById(@Req() req: AuthenticatedRequest, @Param('collectionId') collectionId: string) {
    return this.collectionsService.getById(req.user.userId, collectionId);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(req.user.userId, dto);
  }

  @Patch(':collectionId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(req.user.userId, collectionId, dto);
  }

  @Post(':collectionId/entities/:entityId')
  addEntity(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.collectionsService.addEntity(req.user.userId, collectionId, entityId);
  }

  @Delete(':collectionId/entities/:entityId')
  removeEntity(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.collectionsService.removeEntity(req.user.userId, collectionId, entityId);
  }

  @Patch(':collectionId/entities/:entityId')
  reorderEntity(
    @Req() req: AuthenticatedRequest,
    @Param('collectionId') collectionId: string,
    @Param('entityId') entityId: string,
    @Body() dto: ReorderCollectionItemDto,
  ) {
    return this.collectionsService.reorderEntity(
      req.user.userId,
      collectionId,
      entityId,
      dto.sortOrder,
    );
  }
}
