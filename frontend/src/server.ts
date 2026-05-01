import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const backendOrigin = (process.env['SSR_API_ORIGIN'] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const allowedHosts = (process.env['NG_ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const app = express();
const angularApp = new AngularNodeAppEngine({ allowedHosts });

function hasFingerprint(assetPath: string): boolean {
  return /-[A-Z0-9]{6,}\.(?:js|mjs|css|woff2?|png|jpg|jpeg|webp|avif|svg)$/i.test(assetPath);
}

app.use(['/api', '/uploads'], express.raw({ type: '*/*', limit: '25mb' }));

app.use(['/api', '/uploads'], async (req, res, next) => {
  try {
    const targetUrl = `${backendOrigin}${req.originalUrl}`;
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || key === 'host' || key === 'content-length' || key === 'connection') {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, item);
        }
        continue;
      }

      headers.set(key, value);
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      duplex: 'half',
    } as RequestInit);

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (key === 'content-encoding' || key === 'transfer-encoding' || key === 'connection') {
        return;
      }

      res.setHeader(key, value);
    });

    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (error) {
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      if (hasFingerprint(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4200;

  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`🚀 SSR running on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
