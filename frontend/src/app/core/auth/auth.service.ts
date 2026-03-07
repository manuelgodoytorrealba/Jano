import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponse, AuthUser } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private readonly baseUrl = 'http://localhost:3000/api/auth';
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

  register(data: { email: string; password: string; name?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, data).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, data).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  me(): Observable<{ userId: string; email: string; role: string }> {
    return this.http.get<{ userId: string; email: string; role: string }>(`${this.baseUrl}/me`);
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.userSubject.next(null);
  }

  private persistSession(res: AuthResponse) {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, res.accessToken);
      localStorage.setItem(this.userKey, JSON.stringify(res.user));
    }
    this.userSubject.next(res.user);
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