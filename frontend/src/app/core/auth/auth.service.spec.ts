import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('jano_access_token', 'legacy-token');
    localStorage.setItem('jano_user', '{"role":"ADMIN"}');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('uses the server session and never persists the JWT or user in localStorage', () => {
    expect(localStorage.getItem('jano_access_token')).toBeNull();
    expect(localStorage.getItem('jano_user')).toBeNull();

    service.login({ email: ' USER@EXAMPLE.COM ', password: 'password-123' }).subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'user@example.com', password: 'password-123' });
    request.flush({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        avatarUrl: null,
        role: 'USER',
        isBeta: false,
        createdAt: '2026-01-01',
      },
    });

    expect(service.currentUser?.email).toBe('user@example.com');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('jano_access_token')).toBeNull();
    expect(localStorage.getItem('jano_user')).toBeNull();
  });

  it('restores identity only from /auth/me and clears it after logout', () => {
    service.restoreSession().subscribe((user) => expect(user?.email).toBe('user@example.com'));
    http.expectOne('/api/auth/me').flush({
      userId: 'user-1',
      email: 'user@example.com',
      name: null,
      avatarUrl: null,
      role: 'USER',
      isBeta: false,
      createdAt: '2026-01-01',
    });
    expect(service.currentUser?.id).toBe('user-1');

    service.logout();
    expect(service.currentUser).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    http.expectOne('/api/auth/logout').flush(null);
  });

  it('uses public reset endpoints without exposing a token to browser storage', () => {
    service.forgotPassword(' USER@EXAMPLE.COM ').subscribe();
    const forgot = http.expectOne('/api/auth/forgot-password');
    expect(forgot.request.body).toEqual({ email: 'user@example.com' });
    forgot.flush(null);

    service.resetPassword('reset-token', 'new-password').subscribe();
    http.expectOne('/api/auth/reset-password').flush(null);
    expect(localStorage.getItem('jano_access_token')).toBeNull();
  });
});
