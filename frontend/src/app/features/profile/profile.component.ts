import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthUser } from '../../core/auth/auth.types';

@Component({
  standalone: true,
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly passwordSaving = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal(false);
  readonly verificationMessage = signal('');
  nameDraft = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  isAdmin(user: AuthUser | null | undefined): boolean {
    return String(user?.role ?? '').toUpperCase() === 'ADMIN';
  }

  roleLabel(user: AuthUser | null | undefined): string {
    return this.isAdmin(user) ? this.i18n.t('role.admin') : this.i18n.t('role.member');
  }

  beginEditing(user: AuthUser): void {
    this.nameDraft = user.name ?? '';
    this.error.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.error.set('');
  }

  saveName(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.auth.updateProfile({ name: this.nameDraft }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.i18n.t('profile.updateNameError'));
      },
    });
  }

  uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.auth.uploadAvatar(file).subscribe({
      next: () => {
        this.saving.set(false);
        input.value = '';
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.i18n.t('profile.updateAvatarError'));
      },
    });
  }

  changePassword(): void {
    if (this.passwordSaving()) return;
    this.passwordError.set('');
    this.passwordSuccess.set(false);
    if (this.newPassword.length < 8 || this.newPassword !== this.confirmPassword) {
      this.passwordError.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    this.passwordSaving.set(true);
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (error) => {
        this.passwordSaving.set(false);
        this.passwordError.set(
          error?.status === 401
            ? this.i18n.t('auth.currentPasswordInvalid')
            : this.i18n.t('auth.changePasswordError'),
        );
      },
    });
  }

  resendVerification(): void {
    this.verificationMessage.set('');
    this.auth
      .resendVerification()
      .subscribe({
        next: () => this.verificationMessage.set(this.i18n.t('auth.verificationSent')),
      });
  }
}
