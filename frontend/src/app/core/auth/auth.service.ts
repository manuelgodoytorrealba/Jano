import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse, AuthUser, SessionUser } from './auth.types';
import { apiUrl } from '../api/api-base';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private readonly baseUrl = apiUrl('/auth');
  private readonly legacyStorageKeys = ['jano_access_token', 'jano_user'];

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  private sessionStateSubject = new BehaviorSubject<'unknown' | 'authenticated' | 'anonymous'>(
    'unknown',
  );
  private sessionRestore$: Observable<AuthUser | null> | null = null;

  user$ = this.userSubject.asObservable();
  sessionState$ = this.sessionStateSubject.asObservable();

  constructor() {
    this.clearLegacyStorage();
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return this.sessionStateSubject.value === 'authenticated';
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, {
        ...data,
        email: data.email.trim().toLowerCase(),
      })
      .pipe(tap((res) => this.persistSession(res)));
  }

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, {
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
      })
      .pipe(tap((res) => this.persistSession(res)));
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, {
      email: email.trim().toLowerCase(),
    });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, { token, password });
  }

  verifyEmail(token: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/verify-email`, { token });
  }

  resendVerification(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/resend-verification`, {});
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/change-password`, { currentPassword, newPassword })
      .pipe(tap(() => this.clearSession()));
  }

  me(): Observable<AuthUser> {
    return this.http
      .get<SessionUser>(`${this.baseUrl}/me`)
      .pipe(map((user) => this.normalizeSessionUser(user)));
  }

  refreshSession(): Observable<AuthUser> {
    return this.me().pipe(
      tap((user) => this.persistUser(user)),
      catchError((error) => {
        this.clearSession();
        return throwError(() => error);
      }),
    );
  }

  restoreSession(): Observable<AuthUser | null> {
    if (this.sessionStateSubject.value !== 'unknown') {
      return of(this.currentUser);
    }

    if (!this.sessionRestore$) {
      this.sessionRestore$ = this.me().pipe(
        tap((user) => this.persistUser(user)),
        map((user) => user as AuthUser | null),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => {
          this.sessionRestore$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.sessionRestore$;
  }

  updateProfile(data: { name: string }): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.baseUrl}/me`, data)
      .pipe(tap((user) => this.persistUser(user)));
  }

  uploadAvatar(file: File): Observable<AuthUser> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<AuthUser>(`${this.baseUrl}/me/avatar`, body)
      .pipe(tap((user) => this.persistUser(user)));
  }

  logout() {
    this.http.post<void>(`${this.baseUrl}/logout`, {}).subscribe({ error: () => undefined });
    this.clearSession();
  }

  private persistSession(res: AuthResponse) {
    this.persistUser(res.user);
  }

  private persistUser(user: AuthUser) {
    this.userSubject.next(user);
    this.sessionStateSubject.next('authenticated');
  }

  private normalizeSessionUser(user: SessionUser): AuthUser {
    return {
      id: user.id ?? user.userId ?? '',
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      isBeta: user.isBeta === true,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
    };
  }

  private clearSession() {
    this.clearLegacyStorage();
    this.userSubject.next(null);
    this.sessionStateSubject.next('anonymous');
  }

  private clearLegacyStorage() {
    if (!this.isBrowser) return;
    for (const key of this.legacyStorageKeys) {
      localStorage.removeItem(key);
    }
  }
}
