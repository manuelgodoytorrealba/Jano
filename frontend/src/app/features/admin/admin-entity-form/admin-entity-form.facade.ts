import { Injectable, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import {
  AdminEntitiesApi,
  AdminEntityPayload,
  AdminEntityTranslationPayload,
  AdminLocale,
} from '../../../core/api/admin-entities.api';

export type EntitySaveState = 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class AdminEntityFormFacade {
  private readonly api = inject(AdminEntitiesApi);

  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly saveState = signal<EntitySaveState>('idle');
  readonly lastSavedAt = signal<Date | null>(null);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly translationSaving = signal(false);
  readonly translationMessage = signal('');
  readonly translationError = signal('');

  loadEntity(id: string) {
    this.loading.set(true);
    this.loadError.set('');

    return this.api.getById(id).pipe(
      tap(() => this.loading.set(false)),
      catchError((error) => {
        this.loading.set(false);
        this.loadError.set(error?.error?.message ?? 'No se pudo cargar la entity');
        return throwError(() => error);
      }),
    );
  }

  refreshEntity(id: string) {
    return this.api.getById(id);
  }

  saveEntity(id: string | null, payload: AdminEntityPayload) {
    const isEdit = !!id;
    this.saving.set(true);
    this.saveState.set('saving');
    this.errorMessage.set('');
    this.successMessage.set('Guardando cambios en el backend...');

    return (isEdit ? this.api.update(id, payload) : this.api.create(payload)).pipe(
      tap(() => {
        this.saving.set(false);
        this.saveState.set('saved');
        this.lastSavedAt.set(new Date());
        this.successMessage.set(
          isEdit ? 'Entity actualizada correctamente.' : 'Entity creada correctamente.',
        );
      }),
      catchError((error) => {
        this.saving.set(false);
        this.saveState.set('error');
        this.errorMessage.set(error?.error?.message ?? 'No se pudo guardar la entity');
        this.successMessage.set('');
        return throwError(() => error);
      }),
    );
  }

  saveTranslation(id: string, locale: AdminLocale, payload: AdminEntityTranslationPayload) {
    this.translationSaving.set(true);
    this.translationMessage.set('Guardando traducción...');
    this.translationError.set('');

    return this.api.upsertTranslation(id, locale, payload).pipe(
      tap(() => {
        this.translationSaving.set(false);
        this.translationMessage.set('Traducción guardada.');
      }),
      catchError((error) => {
        this.translationSaving.set(false);
        this.translationMessage.set('');
        this.translationError.set(error?.error?.message ?? 'No se pudo guardar la traducción.');
        return throwError(() => error);
      }),
    );
  }

  setSaveError(message: string) {
    this.errorMessage.set(message);
    this.saveState.set('error');
  }
}
