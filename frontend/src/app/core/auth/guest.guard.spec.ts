import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  it('redirects an authenticated user away from login and register', async () => {
    const auth = { restoreSession: vi.fn(() => of({ id: 'user-1' })) };
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
      guestGuard({} as never, {} as never),
    ) as ReturnType<typeof of>;
    await firstValueFrom(result);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/my-space']);
  });
});
