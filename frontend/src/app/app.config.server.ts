import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SSR_API_ORIGIN } from './core/api/api-origin.token';
import { SSR_ASSET_ORIGIN } from './core/i18n/i18n.service';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: SSR_ASSET_ORIGIN,
      useValue: `http://127.0.0.1:${process.env['PORT'] || '4200'}`,
    },
    {
      provide: SSR_API_ORIGIN,
      useValue: (
        process.env['SSR_API_ORIGIN'] ??
        process.env['API_PROXY_TARGET'] ??
        'http://127.0.0.1:3000'
      ).replace(/\/+$/, ''),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
