import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  it('refreshes the session and allows access when the backend confirms ADMIN', async () => {
    const auth = {
      isAuthenticated: vi.fn(() => true),
      currentUser: null,
      refreshSession: vi.fn(() =>
        of({
          id: '1',
          email: 'admin@test.com',
          name: null,
          role: 'ADMIN',
          isBeta: true,
        }),
      ),
    };
    const router = {
      createUrlTree: vi.fn(
        (commands: unknown[], extras?: { queryParams?: Record<string, string> }) =>
          ({
            commands,
            extras,
          }) as unknown as UrlTree,
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: 'PLATFORM_ID', useValue: 'browser' },
      ],
    });

    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin/entities' } as never),
    ) as ReturnType<typeof of>;

    await expect(firstValueFrom(result$)).resolves.toBe(true);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when refresh fails', async () => {
    const auth = {
      isAuthenticated: vi.fn(() => true),
      currentUser: null,
      refreshSession: vi.fn(() => throwError(() => new Error('401'))),
    };
    const router = {
      createUrlTree: vi.fn(
        (commands: unknown[], extras?: { queryParams?: Record<string, string> }) =>
          ({
            commands,
            extras,
          }) as unknown as UrlTree,
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: 'PLATFORM_ID', useValue: 'browser' },
      ],
    });

    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin/entities' } as never),
    ) as ReturnType<typeof of>;
    const resolved = await firstValueFrom(result$);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirectTo: '/admin/entities' },
    });
    expect(resolved).toEqual({
      commands: ['/login'],
      extras: { queryParams: { redirectTo: '/admin/entities' } },
    });
  });
});
