import type { RequestHandler } from 'express';
import { posix } from 'node:path';

export const publicUploadsOnly: RequestHandler = (request, response, next) => {
  let pathname: string;
  try {
    pathname = posix.normalize('/' + decodeURIComponent(request.path).replaceAll('\\', '/'));
  } catch {
    response.sendStatus(400);
    return;
  }
  if (pathname === '/research' || pathname.startsWith('/research/')) {
    response.sendStatus(404);
    return;
  }
  next();
};
