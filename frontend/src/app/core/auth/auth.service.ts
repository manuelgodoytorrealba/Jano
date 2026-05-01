import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse, AuthUser, SessionUser } from './auth.types';
import { apiUrl } from '../api/api-base';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private readonly baseUrl = apiUrl('/auth');
  private readonly tokenKey = 'jano_access_token';
  private readonly userKey = 'jano_user';

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private userSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());
  user$ = this.userSubject.asObservable();

  get token(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, {
      ...data,
      email: data.email.trim().toLowerCase(),
    }).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  me(): Observable<AuthUser> {
    return this.http.get<SessionUser>(`${this.baseUrl}/me`).pipe(
      map((user) => this.normalizeSessionUser(user)),
    );
  }

  refreshSession(): Observable<AuthUser> {
    return this.me().pipe(
      tap((user) => this.persistUser(user)),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  logout() {
    this.http.post<void>(`${this.baseUrl}/logout`, {}).subscribe({ error: () => undefined });

    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.userSubject.next(null);
  }

  private persistSession(res: AuthResponse) {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, res.accessToken);
    }
    this.persistUser(res.user);
  }

  private persistUser(user: AuthUser) {
    if (this.isBrowser) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    this.userSubject.next(user);
  }

  private normalizeSessionUser(user: SessionUser): AuthUser {
    return {
      id: user.id ?? user.userId ?? '',
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      isBeta: user.isBeta === true,
    };
  }

  private readStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;

    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
