import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  it('allows access when the verified session confirms ADMIN', async () => {
    const auth = {
      restoreSession: vi.fn(() =>
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
      ],
    });

    const result$ = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin/entities' } as never),
    ) as ReturnType<typeof of>;

    await expect(firstValueFrom(result$)).resolves.toBe(true);
    expect(auth.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('redirects anonymous users to login', async () => {
    const auth = {
      restoreSession: vi.fn(() => of(null)),
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

  it('denies a verified USER from admin routes', async () => {
    const auth = { restoreSession: vi.fn(() => of({ id: '1', role: 'USER' })) };
    const router = {
      createUrlTree: vi.fn((commands: unknown[]) => ({ commands }) as unknown as UrlTree),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin' } as never),
    ) as ReturnType<typeof of>;
    await firstValueFrom(result);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
