import { InjectionToken } from '@angular/core';

export const SSR_API_ORIGIN = new InjectionToken<string>('SSR_API_ORIGIN', {
  providedIn: 'root',
  factory: () => '',
});
