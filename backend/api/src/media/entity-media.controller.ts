import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateEntityMediaDto } from '../entities/dto/create-entity-media.dto';
import { UpdateEntityMediaDto } from '../entities/dto/update-entity-media.dto';
import { UploadEntityMediaDto } from '../entities/dto/upload-entity-media.dto';
import { EntityMediaService, type UploadedImageFile } from './entity-media.service';
import { MEDIA_IMAGE_UPLOAD_OPTIONS } from './image-upload.config';
import { EntityMediaLifecycleService } from './entity-media-lifecycle.service';

@Controller('entities')
export class EntityMediaController {
  constructor(
    private readonly service: EntityMediaService,
    private readonly lifecycle: EntityMediaLifecycleService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media')
  create(@Param('id') id: string, @Body() dto: CreateEntityMediaDto) {
    return this.service.adminCreateMedia(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/upload')
  @UseInterceptors(FileInterceptor('file', MEDIA_IMAGE_UPLOAD_OPTIONS))
  async upload(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
    @Body() dto: UploadEntityMediaDto,
  ) {
    try {
      return await this.service.adminUploadMedia(id, file, dto);
    } catch (error) {
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/media/:linkId')
  update(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateEntityMediaDto,
  ) {
    return this.service.adminUpdateMedia(id, linkId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/ingest')
  ingest(@Param('id') id: string, @Param('linkId') linkId: string) {
    return this.lifecycle.adminIngestMedia(id, linkId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/promote')
  promote(@Param('id') id: string, @Param('linkId') linkId: string) {
    return this.lifecycle.adminPromoteIngestedMedia(id, linkId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/restore-external')
  restoreExternal(@Param('id') id: string, @Param('linkId') linkId: string) {
    return this.lifecycle.adminRestoreExternalMedia(id, linkId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/media/:linkId')
  remove(@Param('id') id: string, @Param('linkId') linkId: string) {
    return this.service.adminDeleteMedia(id, linkId);
  }
}
