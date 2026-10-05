import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { info, muted, success } from './config/terminal';
import { requestLoggingMiddleware } from './observability/request-logging';
import { MetricsService } from './observability/metrics';

async function bootstrap() {
  // Pass the adapter explicitly: npm workspaces may install this backend-owned
  // package below backend/api while @nestjs/core is hoisted to the repository root.
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  const expressInstance = app.getHttpAdapter().getInstance() as express.Express;
  const configService = app.get(ConfigService);
  const metrics = app.get(MetricsService);
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN', 'http://localhost:4200');
  const corsOrigins = frontendOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableShutdownHooks();

  expressInstance.disable('x-powered-by');
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) =>
    requestLoggingMiddleware(req, res, next, metrics),
  );
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.use('/uploads/research', (_req: express.Request, res: express.Response) => {
    res.sendStatus(404);
  });
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
  // A failed bootstrap may already own database handles; terminate instead of
  // leaving a stale process that can poison the next watch reload.
  process.exit(1);
});
