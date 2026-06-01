import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppSettingsApi } from '../../core/api/app-settings.api';
import { AppAppearanceService, type AppThemePreference } from '../../core/app-appearance.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, type AppLocale } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly appearance = inject(AppAppearanceService);
  readonly i18n = inject(I18nService);
  private readonly settingsApi = inject(AppSettingsApi);

  selectedBackgroundFile: File | null = null;
  selectedBackgroundPreviewUrl: string | null = null;
  backgroundSaving = false;
  backgroundError = '';
  backgroundMessage = '';

  get selectedBackgroundMeta(): string {
    if (!this.selectedBackgroundFile) {
      return this.i18n.t('settings.background.fileTypes');
    }

    const sizeInMb = this.selectedBackgroundFile.size / (1024 * 1024);
    return `${this.selectedBackgroundFile.name} · ${sizeInMb.toFixed(sizeInMb >= 10 ? 0 : 1)} MB`;
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role ?? "";
    return role === "ADMIN" ? this.i18n.t('role.admin') : role || this.i18n.t('role.none');
  }

  setThemePreference(preference: AppThemePreference): void {
    this.appearance.setThemePreference(preference);
  }

  setLocale(locale: AppLocale): void {
    this.i18n.setLocale(locale);
  }

  ngOnDestroy(): void {
    this.revokeSelectedPreview();
  }

  onBackgroundSelected(event: Event): void {
    this.backgroundError = '';
    this.backgroundMessage = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.revokeSelectedPreview();
    this.selectedBackgroundFile = null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.backgroundError = this.i18n.t('settings.background.invalidImage');
      input.value = '';
      return;
    }

    this.selectedBackgroundFile = file;
    this.selectedBackgroundPreviewUrl = URL.createObjectURL(file);
  }

  uploadBackground(): void {
    if (!this.selectedBackgroundFile || this.backgroundSaving) {
      return;
    }

    this.backgroundSaving = true;
    this.backgroundError = '';
    this.backgroundMessage = '';

    this.settingsApi.uploadBackground(this.selectedBackgroundFile).subscribe({
      next: (settings) => {
        this.backgroundSaving = false;
        this.backgroundMessage = this.i18n.t('settings.background.updated');
        this.appearance.setBackgroundImageUrl(settings.backgroundImageUrl ?? null);
        this.selectedBackgroundFile = null;
        this.revokeSelectedPreview();
      },
      error: () => {
        this.backgroundSaving = false;
        this.backgroundError = this.i18n.t('settings.background.saveError');
      },
    });
  }

  resetBackground(): void {
    if (this.backgroundSaving) {
      return;
    }

    this.backgroundSaving = true;
    this.backgroundError = '';
    this.backgroundMessage = '';

    this.settingsApi.resetBackground().subscribe({
      next: (settings) => {
        this.backgroundSaving = false;
        this.backgroundMessage = this.i18n.t('settings.background.fallbackRestored');
        this.appearance.setBackgroundImageUrl(settings.backgroundImageUrl ?? null);
        this.selectedBackgroundFile = null;
        this.revokeSelectedPreview();
      },
      error: () => {
        this.backgroundSaving = false;
        this.backgroundError = this.i18n.t('settings.background.restoreError');
      },
    });
  }

  private revokeSelectedPreview(): void {
    if (this.selectedBackgroundPreviewUrl) {
      URL.revokeObjectURL(this.selectedBackgroundPreviewUrl);
      this.selectedBackgroundPreviewUrl = null;
    }
  }
}
