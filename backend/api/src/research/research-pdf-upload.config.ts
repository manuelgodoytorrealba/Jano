import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

export type UploadedResearchPdf = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export const RESEARCH_PDF_UPLOAD_OPTIONS = {
  storage: diskStorage({
    destination: (
      _req: unknown,
      _file: unknown,
      callback: (error: Error | null, path: string) => void,
    ) => {
      const destination = join(process.cwd(), 'uploads', 'research');
      mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (
      _req: unknown,
      file: { originalname: string },
      callback: (error: Error | null, filename: string) => void,
    ) => callback(null, `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (
    _req: unknown,
    file: { mimetype?: string; originalname: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (
      file.mimetype !== 'application/pdf' ||
      extname(file.originalname).toLowerCase() !== '.pdf'
    ) {
      callback(new BadRequestException('Formato no permitido. Usa un archivo PDF.'), false);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
};
