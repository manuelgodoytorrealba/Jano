import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export const MEDIA_IMAGE_UPLOAD_OPTIONS = {
  storage: diskStorage({
    destination: (
      _req: unknown,
      _file: unknown,
      callback: (error: Error | null, path: string) => void,
    ) => {
      const destination = join(process.cwd(), 'uploads', 'media');
      mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (
      _req: unknown,
      file: { originalname: string },
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const suffix = `${Date.now()}-${randomUUID()}`;
      callback(null, `${suffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (
    _req: unknown,
    file: { mimetype?: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
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
};
