import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { ListEntitiesQuery } from './dto/list-entities.query';
import { CreateEntityMediaDto } from './dto/create-entity-media.dto';
import { UpdateEntityMediaDto } from './dto/update-entity-media.dto';
import { UploadEntityMediaDto } from './dto/upload-entity-media.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

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
    return this.service.adminGetById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media')
  createMedia(
    @Param('id') id: string,
    @Body() dto: CreateEntityMediaDto,
  ) {
    return this.service.adminCreateMedia(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'media');
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_req, file, callback) => {
          const suffix = `${Date.now()}-${randomUUID()}`;
          callback(null, `${suffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype?.startsWith('image/')) {
          callback(new BadRequestException('Solo se permiten imágenes'), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
    @Body() dto: UploadEntityMediaDto,
  ) {
    return this.service.adminUploadMedia(id, file, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/media/:linkId')
  updateMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateEntityMediaDto,
  ) {
    return this.service.adminUpdateMedia(id, linkId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/media/:linkId')
  deleteMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.adminDeleteMedia(id, linkId);
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
