import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UploadedBackgroundFile = {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
};

const BACKGROUND_IMAGE_KEY = 'global.backgroundImageUrl';

@Injectable()
export class AppSettingsService {
  private readonly mediaPublicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  constructor(private readonly prisma: PrismaService) {}

  async getPublicSettings() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: BACKGROUND_IMAGE_KEY },
    });

    return {
      backgroundImageUrl: setting?.value ?? null,
    };
  }

  async uploadBackground(file: UploadedBackgroundFile | undefined) {
    if (!file) {
      throw new BadRequestException('Background image is required.');
    }

    const backgroundImageUrl = `${this.mediaPublicBaseUrl}/uploads/app-backgrounds/${file.filename}`;

    await this.prisma.appSetting.upsert({
      where: { key: BACKGROUND_IMAGE_KEY },
      create: {
        key: BACKGROUND_IMAGE_KEY,
        value: backgroundImageUrl,
      },
      update: {
        value: backgroundImageUrl,
      },
    });

    return { backgroundImageUrl };
  }

  async resetBackground() {
    await this.prisma.appSetting.upsert({
      where: { key: BACKGROUND_IMAGE_KEY },
      create: {
        key: BACKGROUND_IMAGE_KEY,
        value: null,
      },
      update: {
        value: null,
      },
    });

    return { backgroundImageUrl: null };
  }
}
