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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { MEDIA_IMAGE_UPLOAD_OPTIONS } from '../media/image-upload.config';
import type { UploadedImageFile } from '../media/entity-media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateEntityTypeDefinitionDto,
  UpdateArchiveCardDto,
  UpdateEntityTypeDefinitionDto,
  UpdateEntityTypeFieldsDto,
} from './dto/entity-type-definition.dto';
import { EntityTypeDefinitionService } from './entity-type-definition.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('entity-types')
export class EntityTypeDefinitionController {
  constructor(private readonly types: EntityTypeDefinitionService) {}
  @Get() list(@Query('active') active?: string) {
    return this.types.list(active !== 'true');
  }
  @Post() create(@Body() dto: CreateEntityTypeDefinitionDto) {
    return this.types.create(dto);
  }
  @Patch(':key') update(@Param('key') key: string, @Body() dto: UpdateEntityTypeDefinitionDto) {
    return this.types.update(key, dto);
  }
  @Post(':key/archive-card')
  @UseInterceptors(FileInterceptor('file', MEDIA_IMAGE_UPLOAD_OPTIONS))
  async updateArchiveCard(
    @Param('key') key: string,
    @Body() dto: UpdateArchiveCardDto,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    try {
      return await this.types.updateArchiveCard(key, dto, file);
    } catch (error) {
      if (file?.path) await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Patch(':key/fields') replaceFields(
    @Param('key') key: string,
    @Body() dto: UpdateEntityTypeFieldsDto,
  ) {
    return this.types.replaceFields(key, dto.fields);
  }
  @Delete(':key') remove(@Param('key') key: string) {
    return this.types.remove(key);
  }
}
