import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';


@Component({
  standalone: true,
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="auth-page">
      <h1>Login</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <input type="email" placeholder="Email" formControlName="email" />
        <input type="password" placeholder="Password" formControlName="password" />
        <button type="submit" [disabled]="form.invalid || loading()">Entrar</button>
      </form>

      @if (error()) {
        <p>{{ error() }}</p>
      }
    </section>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);


  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);

        const redirectTo =
          this.route.snapshot.queryParamMap.get('redirectTo') || '/my-space';

        this.router.navigateByUrl(redirectTo);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Login failed');
      },
    });
  }
}