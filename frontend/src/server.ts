import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const backendOrigin = (
  process.env['SSR_API_ORIGIN'] ??
  process.env['API_PROXY_TARGET'] ??
  'http://127.0.0.1:3000'
).replace(/\/+$/, '');

const defaultAllowedHosts = ['localhost', '127.0.0.1', 'jano.manuelgodoy.eu'];

function normalizeHost(host: string): string {
  return host
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(',')[0]?.trim() || null;
}

function cookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function isPublicSsrPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/blocked' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    /\.[a-z0-9]{2,8}$/i.test(pathname)
  );
}

function loginRedirectFor(req: express.Request): string {
  const redirectTo = encodeURIComponent(req.originalUrl || '/');
  return `/login?redirectTo=${redirectTo}`;
}

async function validateBetaSession(req: express.Request): Promise<'ok' | 'unauthorized'> {
  const authorization = firstHeaderValue(req.headers.authorization);
  const cookieToken = cookieValue(req.headers.cookie, 'jano_access_token');
  const headers = new Headers();

  if (authorization) {
    headers.set('authorization', authorization);
  } else if (cookieToken) {
    headers.set('authorization', 'Bearer ' + cookieToken);
  }

  if (!headers.has('authorization')) {
    return 'unauthorized';
  }

  const response = await fetch(backendOrigin + '/api/auth/me', { headers });

  if (response.status === 401) return 'unauthorized';
  if (!response.ok) return 'unauthorized';

  return 'ok';
}

const allowedHosts = Array.from(
  new Set([
    ...defaultAllowedHosts,
    ...(process.env['NG_ALLOWED_HOSTS'] ?? '').split(',').map(normalizeHost).filter(Boolean),
  ]),
);

const allowedHostSet = new Set(allowedHosts);

const app = express();
app.set('trust proxy', true);

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, _res, next) => {
  const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);

  if (forwardedHost && allowedHostSet.has(normalizeHost(forwardedHost))) {
    req.headers.host = forwardedHost;
  }

  next();
});

const angularApp = new AngularNodeAppEngine({ allowedHosts });

function hasFingerprint(assetPath: string): boolean {
  return /-[A-Z0-9]{6,}\.(?:js|mjs|css|woff2?|png|jpg|jpeg|webp|avif|svg)$/i.test(assetPath);
}

app.use(['/api', '/uploads'], express.raw({ type: '*/*', limit: '300mb' }));

app.use(['/api', '/uploads'], (req, res, next) => {
  void (async () => {
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
  })().catch(next);
});

app.use((req, res, next) => {
  if (isPublicSsrPath(req.path)) {
    next();
    return;
  }

  void validateBetaSession(req)
    .then((session) => {
      if (session === 'ok') {
        next();
        return;
      }

      res.redirect(302, loginRedirectFor(req));
    })
    .catch(next);
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
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
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
