import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SavedApi {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/me/saved';

  list() {
    return this.http.get<any[]>(this.baseUrl);
  }

  save(entityId: string) {
    return this.http.post<any>(`${this.baseUrl}/${entityId}`, {});
  }

  remove(entityId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${entityId}`);
  }
}