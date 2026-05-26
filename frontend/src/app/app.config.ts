import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { ssrApiOriginInterceptor } from './core/api/ssr-api-origin.interceptor';
import { I18nService } from './core/i18n/i18n.service';
import { localeInterceptor } from './core/i18n/locale.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([ssrApiOriginInterceptor, authInterceptor, localeInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [I18nService],
      useFactory: (i18n: I18nService) => () => firstValueFrom(i18n.load()),
    }
  ],
};
