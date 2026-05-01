import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { SSR_API_ORIGIN } from './api-origin.token';

export const ssrApiOriginInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const ssrApiOrigin = inject(SSR_API_ORIGIN).replace(/\/+$/, '');

  if (!isPlatformServer(platformId) || !ssrApiOrigin) {
    return next(req);
  }

  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    return next(req);
  }

  return next(req.clone({ url: `${ssrApiOrigin}${req.url}` }));
};
