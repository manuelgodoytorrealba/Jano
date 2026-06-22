import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { info, muted, success } from './config/terminal';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN', 'http://localhost:4200');
  const corsOrigins = frontendOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads'), {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (/\.(avif|webp|png|jpe?g|gif|svg)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
          return;
        }

        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      },
    }),
  );

  // ✅ Añadir esto
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port, host);
  console.log(success(`Backend running on http://localhost:${port}`));
  console.log(info(`Allowed frontend origin(s): ${corsOrigins.join(', ')}`));
  console.log(muted(`Uploads served from ${join(process.cwd(), 'uploads')}`));
}
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
