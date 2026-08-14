import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('resolves /auth/me instead of trusting browser storage', async () => {
    const auth = {
      restoreSession: vi.fn(() =>
        of({
          id: 'user-1',
          email: 'user@example.com',
          name: null,
          avatarUrl: null,
          role: 'USER',
          isBeta: false,
          createdAt: '2026-01-01',
        }),
      ),
    };
    const router = { createUrlTree: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/profile' } as never),
    ) as ReturnType<typeof of>;
    await expect(firstValueFrom(result)).resolves.toBe(true);
    expect(auth.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('redirects anonymous users to login', async () => {
    const auth = { restoreSession: vi.fn(() => of(null)) };
    const router = {
      createUrlTree: vi.fn(
        (commands: unknown[], extras: unknown) => ({ commands, extras }) as unknown as UrlTree,
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/profile' } as never),
    ) as ReturnType<typeof of>;
    await firstValueFrom(result);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirectTo: '/profile' },
    });
  });

  it('allows an authenticated user into My Space', async () => {
    const auth = { restoreSession: vi.fn(() => of({ id: 'user-1', role: 'USER' })) };
    const router = { createUrlTree: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/my-space' } as never),
    ) as ReturnType<typeof of>;
    await expect(firstValueFrom(result)).resolves.toBe(true);
  });
});
