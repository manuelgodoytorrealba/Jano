import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { AuthResponse, LoginDto, RegisterDto, User } from './auth.types';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3000/api/auth';
  private readonly tokenKey = 'jano_token';
  private readonly userKey = 'jano_user';

  readonly user = signal<User | null>(this.getStoredUser());
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.token());

  login(dto: LoginDto) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, dto).pipe(
      tap((response) => {
        this.setSession(response);
      }),
    );
  }

  register(dto: RegisterDto) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, dto).pipe(
      tap((response) => {
        this.setSession(response);
      }),
    );
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }

    this.token.set(null);
    this.user.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  private setSession(response: AuthResponse) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, response.accessToken);
      localStorage.setItem(this.userKey, JSON.stringify(response.user));
    }

    this.token.set(response.accessToken);
    this.user.set(response.user);
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) as User : null;
  }
}