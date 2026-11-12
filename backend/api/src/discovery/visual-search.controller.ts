import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Public } from '../auth/public.decorator';
import { VisualSearchService } from './visual-search.service';

export function imageOwner(req: Request): string | undefined {
  const owner = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('jano_visual='))
    ?.slice(12);
  return owner && /^[a-f\d-]{36}$/i.test(owner) ? owner : undefined;
}
@Controller('search/images')
export class VisualSearchController {
  constructor(private readonly visual: VisualSearchService) {}
  @Public()
  @Post()
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) throw new BadRequestException('An image is required');
    res.setHeader('Cache-Control', 'no-store');
    const owner = imageOwner(req) ?? randomUUID();
    res.cookie('jano_visual', owner, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || req.secure,
      path: '/api',
      maxAge: 30 * 60 * 1000,
    });
    return this.visual.createQuery(file.buffer, owner);
  }
  @Public()
  @Delete()
  remove(@Query('image') id: string, @Req() req: Request) {
    this.visual.removeQuery(id, imageOwner(req));
    return { deleted: true };
  }
}
