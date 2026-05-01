import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  const user = auth.currentUser;

  if (user && !user.isBeta) {
    return router.createUrlTree(['/blocked']);
  }

  if (user?.role === 'ADMIN') {
    return true;
  }

  return auth.refreshSession().pipe(
    map((freshUser) => {
      if (!freshUser.isBeta) return router.createUrlTree(['/blocked']);
      return freshUser.role === 'ADMIN' ? true : router.createUrlTree(['/']);
    }),
    catchError((error) => of(
      error?.status === 403
        ? router.createUrlTree(['/blocked'])
        : router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url },
        }),
    )),
  );
};
