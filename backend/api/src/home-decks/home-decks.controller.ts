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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddHomeDeckEntityDto } from './dto/add-home-deck-entity.dto';
import { CreateHomeDeckDto } from './dto/create-home-deck.dto';
import { ReorderHomeDeckEntityDto } from './dto/reorder-home-deck-entity.dto';
import { UpdateHomeDeckDto } from './dto/update-home-deck.dto';
import { UploadHomeDeckImageDto } from './dto/upload-home-deck-image.dto';
import { HomeDecksService } from './home-decks.service';
import { HomeDeckSurface } from '@prisma/client';

type UploadedImageFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@Controller('home-decks')
export class HomeDecksController {
  constructor(private service: HomeDecksService) {}

  @Get()
  listPublic(@Query('surface') surface?: HomeDeckSurface, @Query('locale') locale?: string) {
    return this.service.listPublic(surface, locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  adminList() {
    return this.service.adminList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  adminGetById(@Param('id') id: string) {
    return this.service.adminGetById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateHomeDeckDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHomeDeckDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/image/upload')
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
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype ?? '')) {
          callback(new BadRequestException('Formato no permitido. Usa JPEG, PNG, WEBP, GIF o AVIF.'), false);
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
    @Body() dto: UploadHomeDeckImageDto,
  ) {
    try {
      return await this.service.uploadImage(id, file, dto);
    } catch (error) {
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/entities')
  addEntity(@Param('id') id: string, @Body() dto: AddHomeDeckEntityDto) {
    return this.service.addEntity(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/entities/:entityId')
  removeEntity(@Param('id') id: string, @Param('entityId') entityId: string) {
    return this.service.removeEntity(id, entityId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/entities/:entityId')
  reorderEntity(
    @Param('id') id: string,
    @Param('entityId') entityId: string,
    @Body() dto: ReorderHomeDeckEntityDto,
  ) {
    return this.service.reorderEntity(id, entityId, dto);
  }
}
