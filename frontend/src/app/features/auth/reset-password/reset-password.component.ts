import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal('');
  readonly token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required]],
  });
  submit(): void {
    if (!this.token || this.form.invalid || this.submitting()) return;
    if (this.form.getRawValue().password !== this.form.getRawValue().confirmPassword) {
      this.error.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.i18n.t('auth.resetPasswordInvalid'));
      },
    });
  }
}
