import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { ListEntitiesQuery } from './dto/list-entities.query';

@Controller('entities')
export class EntitiesController {
  constructor(private service: EntitiesService) { }

  @Get()
  list(@Query() query: ListEntitiesQuery) {
    return this.service.list(query);
  }

  @Get('home')
  home() {
    return this.service.home();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateEntityDto) {
    return this.service.adminCreate(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.service.adminUpdate(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.adminDelete(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  getByIdForAdmin(@Param('id') id: string) {
    console.log('ADMIN GET ENTITY BY ID:', id);
    return this.service.adminGetById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/relations')
  listRelations(@Param('id') id: string) {
    return this.service.adminListRelations(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/relations')
  createRelation(
    @Param('id') id: string,
    @Body() dto: { toId: string; type: string; justification?: string; weight?: number },
  ) {
    return this.service.adminCreateRelation(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/relations/:relationId')
  deleteRelation(
    @Param('id') id: string,
    @Param('relationId') relationId: string,
  ) {
    return this.service.adminDeleteRelation(id, relationId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/relations/incoming')
  listIncomingRelations(@Param('id') id: string) {
    return this.service.adminListIncomingRelations(id);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  @Get(':slug/graph')
  graph(@Param('slug') slug: string) {
    return this.service.graphBySlug(slug);
  }

  @Get(':slug/preview')
  preview(@Param('slug') slug: string) {
    return this.service.previewBySlug(slug);
  }
}