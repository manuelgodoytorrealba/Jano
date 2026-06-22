import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SSR_API_ORIGIN } from './core/api/api-origin.token';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
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
