import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // En SSR no podemos leer localStorage.
  // Dejamos pasar y validamos en navegador.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (auth.isAuthenticated()) {
    if (auth.currentUser) {
      return auth.currentUser.isBeta
        ? true
        : router.createUrlTree(['/blocked']);
    }

    return auth.refreshSession().pipe(
      map((user) => user.isBeta ? true : router.createUrlTree(['/blocked'])),
      catchError((error) => of(
        error?.status === 403
          ? router.createUrlTree(['/blocked'])
          : router.createUrlTree(['/login'], {
            queryParams: { redirectTo: state.url },
          }),
      )),
    );
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });
};
