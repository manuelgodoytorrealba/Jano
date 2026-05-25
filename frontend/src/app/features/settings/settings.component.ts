import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppSettingsApi } from '../../core/api/app-settings.api';
import { AppAppearanceService, type AppThemePreference } from '../../core/app-appearance.service';
import { AuthService } from '../../core/auth/auth.service';

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
  private readonly settingsApi = inject(AppSettingsApi);

  selectedBackgroundFile: File | null = null;
  selectedBackgroundPreviewUrl: string | null = null;
  backgroundSaving = false;
  backgroundError = '';
  backgroundMessage = '';

  get selectedBackgroundMeta(): string {
    if (!this.selectedBackgroundFile) {
      return 'JPEG, PNG, WebP o AVIF';
    }

    const sizeInMb = this.selectedBackgroundFile.size / (1024 * 1024);
    return `${this.selectedBackgroundFile.name} · ${sizeInMb.toFixed(sizeInMb >= 10 ? 0 : 1)} MB`;
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role ?? '';
    return role === 'ADMIN' ? 'Administrador' : role || 'Sin rol';
  }

  setThemePreference(preference: AppThemePreference): void {
    this.appearance.setThemePreference(preference);
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
      this.backgroundError = 'Selecciona una imagen válida.';
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
        this.backgroundMessage = 'Background actualizado';
        this.appearance.setBackgroundImageUrl(settings.backgroundImageUrl ?? null);
        this.selectedBackgroundFile = null;
        this.revokeSelectedPreview();
      },
      error: () => {
        this.backgroundSaving = false;
        this.backgroundError = 'No se pudo guardar el background. Revisa formato y tamaño.';
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
        this.backgroundMessage = 'Fallback restaurado';
        this.appearance.setBackgroundImageUrl(settings.backgroundImageUrl ?? null);
        this.selectedBackgroundFile = null;
        this.revokeSelectedPreview();
      },
      error: () => {
        this.backgroundSaving = false;
        this.backgroundError = 'No se pudo restaurar el fallback.';
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
