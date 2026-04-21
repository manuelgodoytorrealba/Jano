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
import { UpdateEntityDetailsDto } from './dto/update-entity-details.dto';
import { CreateSourceRefDto } from './dto/create-source-ref.dto';
import { UpdateSourceRefDto } from './dto/update-source-ref.dto';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { UpdateContributorDto } from './dto/update-contributor.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

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

@Controller('entities')
export class EntitiesController {
  constructor(private service: EntitiesService) { }

  @Get()
  list(@Query() query: ListEntitiesQuery) {
    return this.service.list(query);
  }

  @Get('institutions')
  institutions() {
    return this.service.listInstitutions();
  }

  @Get('nationalities')
  nationalities() {
    return this.service.listNationalities();
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
  @Patch(':id/details')
  updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateEntityDetailsDto,
  ) {
    return this.service.adminUpdateDetails(id, dto);
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
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype ?? '')) {
          callback(
            new BadRequestException('Formato no permitido. Usa JPEG, PNG, WEBP, GIF o AVIF.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async uploadMedia(
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
  updateMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateEntityMediaDto,
  ) {
    return this.service.adminUpdateMedia(id, linkId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/ingest')
  ingestMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.adminIngestMedia(id, linkId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/promote')
  promoteIngestedMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.adminPromoteIngestedMedia(id, linkId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/media/:linkId/restore-external')
  restoreExternalMedia(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.service.adminRestoreExternalMedia(id, linkId);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/source-refs')
  createSourceRef(
    @Param('id') id: string,
    @Body() dto: CreateSourceRefDto,
  ) {
    return this.service.adminCreateSourceRef(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/source-refs/:refId')
  updateSourceRef(
    @Param('id') id: string,
    @Param('refId') refId: string,
    @Body() dto: UpdateSourceRefDto,
  ) {
    return this.service.adminUpdateSourceRef(id, refId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/source-refs/:refId')
  deleteSourceRef(
    @Param('id') id: string,
    @Param('refId') refId: string,
  ) {
    return this.service.adminDeleteSourceRef(id, refId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/contributors')
  createContributor(
    @Param('id') id: string,
    @Body() dto: CreateContributorDto,
  ) {
    return this.service.adminCreateContributor(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/contributors/:contributorId')
  updateContributor(
    @Param('id') id: string,
    @Param('contributorId') contributorId: string,
    @Body() dto: UpdateContributorDto,
  ) {
    return this.service.adminUpdateContributor(id, contributorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/contributors/:contributorId')
  deleteContributor(
    @Param('id') id: string,
    @Param('contributorId') contributorId: string,
  ) {
    return this.service.adminDeleteContributor(id, contributorId);
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
