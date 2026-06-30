import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import {
  AdminEntityMediaLibraryState,
  buildAdminEntityMediaLibraryState,
  buildMediaPayload,
  buildMediaUpdatePayload,
  buildUploadPayload,
  cloneMediaLibraryState,
  cloneMediaLink,
  mediaLinksEqual,
  removeMediaFromLibraryState,
} from './admin-entity-media.helpers';
import { buildAdminEntityMediaLibraryViewModel } from './admin-entity-media.presenter';
import { AdminEntityFormFacade } from './admin-entity-form.facade';
import type { AdminEntityMediaLibraryIntent } from './admin-entity-media-library.component';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_ROLE_LABELS,
} from './media-admin.models';

export type AdminEntityMediaActionsSnapshot = {
  state: AdminEntityMediaLibraryState;
  persistedResolvedMedia: Record<string, unknown> | null;
  adding: boolean;
  uploading: boolean;
  resetVersion: number;
  message: string;
  error: string;
};

@Injectable()
export class AdminEntityMediaActions {
  private readonly api = inject(AdminEntitiesApi);
  private readonly formFacade = inject(AdminEntityFormFacade);
  readonly changes = new Subject<AdminEntityMediaActionsSnapshot>();

  private entityId = '';
  private state!: AdminEntityMediaLibraryState;
  private persistedResolvedMedia: Record<string, unknown> | null = null;
  private adding = false;
  private uploading = false;
  private resetVersion = 0;
  private message = '';
  private error = '';

  hydrate(entityId: string, snapshot: AdminEntityMediaActionsSnapshot): void {
    this.entityId = entityId;
    this.state = cloneMediaLibraryState(snapshot.state, (value) => this.toNumber(value));
    this.persistedResolvedMedia = snapshot.persistedResolvedMedia;
    this.adding = snapshot.adding;
    this.uploading = snapshot.uploading;
    this.resetVersion = snapshot.resetVersion;
    this.message = snapshot.message;
    this.error = snapshot.error;
  }

  setVisualState(
    activeMediaEditorId: string | null,
    activeMediaLibraryView: AdminEntityMediaLibraryState['activeMediaLibraryView'],
  ): void {
    this.state = { ...this.state, activeMediaEditorId, activeMediaLibraryView };
  }

  handle(intent: AdminEntityMediaLibraryIntent): void {
    switch (intent.type) {
      case 'addExternal':
        return this.addExternal(intent.event);
      case 'upload':
        return this.upload(intent.event);
      case 'draftChange':
        return this.updateDraft(intent.draft);
      case 'assignRole':
        return this.updateDraft({ ...intent.link, role: intent.role });
      case 'toggleLegacy':
        return this.toggleLegacy(intent.link);
      case 'save':
        return this.save(intent.link);
      case 'discard':
        return this.discard(intent.link);
      case 'remove':
        return this.remove(intent.link);
      case 'ingest':
        return this.ingest(intent.link);
      case 'promote':
        return this.promote(intent.link);
      case 'restore':
        return this.restore(intent.link);
    }
  }

  private addExternal(
    event: Extract<AdminEntityMediaLibraryIntent, { type: 'addExternal' }>['event'],
  ): void {
    if (!this.entityId || this.adding) return;
    const result = buildMediaPayload(event.draft, (value) => this.toNumber(value));
    if ('error' in result) return this.fail(result.error);
    this.start();
    this.adding = true;
    this.emit();
    this.api.createMedia(this.entityId, result.payload).subscribe({
      next: () => {
        this.adding = false;
        this.resetVersion++;
        this.message = 'Media añadida correctamente.';
        this.refresh(true);
      },
      error: (error) => {
        this.adding = false;
        this.fail(error?.error?.message ?? 'No se pudo añadir la media.');
      },
    });
  }

  private upload(event: Extract<AdminEntityMediaLibraryIntent, { type: 'upload' }>['event']): void {
    if (!this.entityId || this.uploading) return;
    const payload = buildUploadPayload(event.draft, event.dimensions, (value) =>
      this.toNumber(value),
    );
    this.start();
    this.uploading = true;
    this.emit();
    this.api.uploadMedia(this.entityId, event.file, payload).subscribe({
      next: () => {
        this.uploading = false;
        this.resetVersion++;
        this.message = 'Archivo subido y asociado correctamente.';
        this.refresh(true);
      },
      error: (error) => {
        this.uploading = false;
        this.fail(error?.error?.message ?? 'No se pudo subir el archivo.');
      },
    });
  }

  private save(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!this.entityId || !editor || editor.saveState === 'saving') return;
    const result = buildMediaUpdatePayload(editor.draft, (value) => this.toNumber(value));
    if ('error' in result) return this.fail(result.error);
    this.start();
    editor.saveState = 'saving';
    editor.errorMessage = '';
    this.touch();
    this.api.updateMedia(this.entityId, link.id, result.payload).subscribe({
      next: () => {
        this.message = 'Media actualizada correctamente.';
        this.refresh(true, editor.id);
      },
      error: (error) => {
        editor.saveState = 'error';
        editor.errorMessage = error?.error?.message ?? 'No se pudo actualizar la media.';
        this.fail(editor.errorMessage);
      },
    });
  }

  private remove(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!this.entityId || !editor || editor.removing) return;
    if (!window.confirm('¿Quitar esta media de la entity? La media global no se borrará.')) return;
    const previous = cloneMediaLibraryState(this.state, (value) => this.toNumber(value));
    this.start();
    this.state = removeMediaFromLibraryState(this.state, link.id);
    this.emit();
    this.api.deleteMedia(this.entityId, link.id).subscribe({
      next: () => {
        this.message = 'Asociación de media eliminada.';
        this.refresh(true, editor.id);
      },
      error: (error) => {
        this.state = previous;
        this.fail(error?.error?.message ?? 'No se pudo quitar la media.');
      },
    });
  }

  private ingest(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!this.entityId || !editor || !this.presentation(link).canIngest || editor.ingesting) return;
    if (
      !window.confirm(
        'Se descargará esta media externa al storage local de JANO y se creará un nuevo asset INGESTED. El asset externo original se mantendrá sin cambios. ¿Continuar?',
      )
    )
      return;
    this.start();
    editor.ingesting = true;
    this.touch();
    this.api.ingestMedia(this.entityId, link.id).subscribe({
      next: (created) => {
        editor.ingesting = false;
        this.message = created?.alreadyExisted
          ? 'Ya existía un asset INGESTED derivado de esta referencia.'
          : 'Media ingerida correctamente.';
        this.refresh(true);
      },
      error: (error) => {
        editor.ingesting = false;
        this.fail(error?.error?.message ?? 'No se pudo ingerir la media externa.');
      },
    });
  }

  private promote(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!this.entityId || !editor || !this.presentation(link).canPromote || editor.promoting)
      return;
    const source = this.model().sourceExternalLinkById[link.id];
    const sourceRole = source ? this.roleLabel(source.role) : 'el asset externo origen';
    if (
      !window.confirm(
        `El asset INGESTED asumirá ${sourceRole}, sortOrder, isPrimary, displayMode y focales del externo del que deriva. El externo quedará visible como Additional Media. ¿Continuar?`,
      )
    )
      return;
    this.start();
    editor.promoting = true;
    this.touch();
    this.api.promoteIngestedMedia(this.entityId, link.id).subscribe({
      next: () => {
        editor.promoting = false;
        this.message = 'El asset INGESTED ocupa ahora el papel visual del externo.';
        this.refresh(true);
      },
      error: (error) => {
        editor.promoting = false;
        this.fail(error?.error?.message ?? 'No se pudo promover el asset INGESTED.');
      },
    });
  }

  private restore(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!this.entityId || !editor || !this.presentation(link).canRestore || editor.restoring)
      return;
    const ingested = this.model().replacementIngestedLinkById[link.id];
    const ingestedRole = ingested ? this.roleLabel(ingested.role) : 'el asset ingerido promovido';
    if (
      !window.confirm(
        `El asset EXTERNAL_URL recuperará ${ingestedRole}, sortOrder, isPrimary, displayMode y focales. El INGESTED seguirá visible como Additional Media. ¿Continuar?`,
      )
    )
      return;
    this.start();
    editor.restoring = true;
    this.touch();
    this.api.restoreExternalMedia(this.entityId, link.id).subscribe({
      next: () => {
        editor.restoring = false;
        this.message = 'El asset externo recupera ahora el papel visual principal.';
        this.refresh(true);
      },
      error: (error) => {
        editor.restoring = false;
        this.fail(error?.error?.message ?? 'No se pudo restaurar el asset externo.');
      },
    });
  }

  private updateDraft(draft: EditableAdminMediaLink): void {
    const editor = this.editor(draft);
    if (!editor) return;
    const next = { ...editor, draft: cloneMediaLink(draft, (value) => this.toNumber(value)) };
    this.markDirty(next);
    this.state = {
      ...this.state,
      mediaEditors: this.state.mediaEditors.map((item) => (item.id === next.id ? next : item)),
    };
    this.emit();
  }

  private toggleLegacy(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (!editor) return;
    const value = !editor.draft.isPrimary;
    this.state = {
      ...this.state,
      mediaEditors: this.state.mediaEditors.map((item) => {
        const next = {
          ...item,
          draft:
            item.id === editor.id
              ? { ...item.draft, isPrimary: value }
              : value && item.draft.isPrimary
                ? { ...item.draft, isPrimary: false }
                : item.draft,
        };
        this.markDirty(next);
        return next;
      }),
    };
    this.emit();
  }

  private discard(link: EditableAdminMediaLink): void {
    const editor = this.editor(link);
    if (editor && editor.saveState !== 'saving') this.updateDraft(editor.persisted);
  }
  private editor(link: EditableAdminMediaLink): EditableAdminMediaEditor | null {
    return this.state.mediaEditors.find((item) => item.id === link.id) ?? null;
  }
  private presentation(link: EditableAdminMediaLink) {
    return this.model().editorMetaById[link.id];
  }
  private model() {
    return buildAdminEntityMediaLibraryViewModel({
      ...this.state,
      mediaRoleLabel: (role) => this.roleLabel(role),
    });
  }
  private roleLabel(role: string | null | undefined): string {
    return MEDIA_ROLE_LABELS[role ?? ''] ?? role ?? '—';
  }
  private markDirty(editor: EditableAdminMediaEditor): void {
    editor.isDirty = !mediaLinksEqual(editor.persisted, editor.draft);
    if (!editor.isDirty) {
      editor.saveState = 'idle';
      editor.errorMessage = '';
    }
  }
  private touch(): void {
    this.state = { ...this.state, mediaEditors: [...this.state.mediaEditors] };
    this.emit();
  }
  private start(): void {
    this.error = '';
    this.message = '';
  }
  private fail(message: string): void {
    this.error = message;
    this.touch();
  }

  private refresh(preserveDirtyEditors = true, clearedEditorId?: string): void {
    this.formFacade.refreshEntity(this.entityId).subscribe({
      next: (entity) => {
        this.state = buildAdminEntityMediaLibraryState({
          entity,
          mediaEditors: this.state.mediaEditors,
          activeMediaEditorId: this.state.activeMediaEditorId,
          activeMediaLibraryView: this.state.activeMediaLibraryView,
          preserveDirtyEditors,
          clearedEditorId,
          toNullableNumber: (value) => this.toNumber(value),
        });
        this.persistedResolvedMedia = entity.resolvedMedia ?? null;
        this.emit();
      },
      error: (error) => this.fail(error?.error?.message ?? 'No se pudo refrescar la media.'),
    });
  }

  private emit(): void {
    this.changes.next({
      state: cloneMediaLibraryState(this.state, (value) => this.toNumber(value)),
      persistedResolvedMedia: this.persistedResolvedMedia,
      adding: this.adding,
      uploading: this.uploading,
      resetVersion: this.resetVersion,
      message: this.message,
      error: this.error,
    });
  }
  private toNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
