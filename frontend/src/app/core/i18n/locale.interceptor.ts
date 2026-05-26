import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { I18nService } from './i18n.service';

export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const i18n = inject(I18nService);
  const url = req.url;

  if (!url.includes('/api/') && !url.startsWith('/api/')) {
    return next(req);
  }

  if (req.params.has('locale')) {
    return next(req);
  }

  return next(req.clone({ params: req.params.set('locale', i18n.locale()) }));
};
