import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="card">
        <h1>Login</h1>
        <p class="muted">Accede a tu espacio en JANO</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Email</label>
          <input type="email" formControlName="email" />

          <label>Password</label>
          <input type="password" formControlName="password" />

          @if (error) {
            <div class="error">{{ error }}</div>
          }

          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="foot">
          ¿No tienes cuenta? <a routerLink="/register">Crear cuenta</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page{ min-height:100vh; display:grid; place-items:center; padding:24px; }
    .card{ width:min(420px, 100%); background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:20px; padding:24px; display:grid; gap:14px; }
    h1{ margin:0; }
    .muted{ margin:0; color:#666; }
    form{ display:grid; gap:10px; }
    label{ font-size:13px; color:#555; }
    input{ height:44px; border-radius:12px; border:1px solid rgba(0,0,0,.10); padding:0 12px; }
    button{ height:44px; border:none; border-radius:12px; background:#111; color:#fff; cursor:pointer; }
    .error{ color:#b00020; font-size:13px; }
    .foot{ margin:0; font-size:14px; color:#666; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/my-space']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'No se pudo iniciar sesión';
      },
    });
  }
}