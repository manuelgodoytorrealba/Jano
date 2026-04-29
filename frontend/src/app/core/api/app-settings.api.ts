import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from './api-base';

export type PublicAppSettings = {
  backgroundImageUrl: string | null;
};

@Injectable({ providedIn: 'root' })
export class AppSettingsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiUrl('/app-settings');

  getPublicSettings() {
    return this.http.get<PublicAppSettings>(this.baseUrl);
  }

  uploadBackground(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.patch<PublicAppSettings>(`${this.baseUrl}/background`, form);
  }

  resetBackground() {
    return this.http.delete<PublicAppSettings>(`${this.baseUrl}/background`);
  }
}
