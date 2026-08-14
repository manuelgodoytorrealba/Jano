import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AppSettingsService } from './app-settings.service';
import { Public } from '../auth/public.decorator';

type UploadedBackgroundFile = {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
};

const ALLOWED_BACKGROUND_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Public()
  @Get()
  getPublicSettings() {
    return this.service.getPublicSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('background')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'app-backgrounds');
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_req, file, callback) => {
          const suffix = `${Date.now()}-${randomUUID()}`;
          callback(null, `${suffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_BACKGROUND_MIME_TYPES.has(file.mimetype ?? '')) {
          callback(
            new BadRequestException('Formato no permitido. Usa JPEG, PNG, WEBP o AVIF.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 12 * 1024 * 1024,
      },
    }),
  )
  async uploadBackground(@UploadedFile() file: UploadedBackgroundFile) {
    try {
      return await this.service.uploadBackground(file);
    } catch (error) {
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('background')
  resetBackground() {
    return this.service.resetBackground();
  }
}
