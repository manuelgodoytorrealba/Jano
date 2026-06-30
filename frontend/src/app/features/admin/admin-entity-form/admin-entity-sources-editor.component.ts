import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminEntitiesApi, AdminSourceRefPayload } from '../../../core/api/admin-entities.api';
import {
  AdminEditableSourceRef,
  buildSourceRefPayload,
  createEmptySourceRefDraft,
  normalizeSourceRef,
  upsertSourceRef,
} from './admin-entity-metadata.presenter';

export type AdminEntitySourcesState = {
  sourceRefs: AdminEditableSourceRef[];
  saving: boolean;
  error: string;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-sources-editor',
  imports: [FormsModule],
  templateUrl: './admin-entity-sources-editor.component.html',
  styleUrls: ['./admin-entity-metadata-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntitySourcesEditorComponent implements OnChanges {
  private readonly api = inject(AdminEntitiesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input() active = false;
  @Input() sourceRefs: AdminEditableSourceRef[] = [];
  @Output() stateChange = new EventEmitter<AdminEntitySourcesState>();

  readonly sourceTypes: AdminSourceRefPayload['sourceType'][] = [
    'BOOK',
    'ARTICLE',
    'WEBSITE',
    'CATALOG',
    'PAPER',
  ];
  newSourceRef: AdminSourceRefPayload = createEmptySourceRefDraft();
  sourcesSaving = false;
  sourcesMessage = '';
  sourcesError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sourceRefs']) {
      this.sourceRefs = this.sourceRefs.map((ref) => ({ ...ref }));
    }
  }

  emitDraft(): void {
    this.emitState();
  }

  addSourceRef(): void {
    if (!this.entityId || this.sourcesSaving) return;
    const payload = this.preparePayload(this.newSourceRef);
    if (!payload) return;
    this.startSaving();
    this.api.createSourceRef(this.entityId, payload).subscribe({
      next: (ref) => {
        this.sourcesSaving = false;
        this.sourceRefs = [...this.sourceRefs, normalizeSourceRef(ref)];
        this.newSourceRef = createEmptySourceRefDraft();
        this.sourcesMessage = 'Fuente añadida correctamente.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo añadir la fuente.'),
    });
  }

  saveSourceRef(ref: AdminEditableSourceRef): void {
    if (!this.entityId || this.sourcesSaving) return;
    const payload = this.preparePayload(ref);
    if (!payload) return;
    this.startSaving();
    this.api.updateSourceRef(this.entityId, ref.id, payload).subscribe({
      next: (updated) => {
        this.sourcesSaving = false;
        this.sourceRefs = upsertSourceRef(this.sourceRefs, normalizeSourceRef(updated));
        this.sourcesMessage = 'Fuente actualizada correctamente.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo actualizar la fuente.'),
    });
  }

  removeSourceRef(refId: string): void {
    if (!this.entityId || this.sourcesSaving) return;
    if (!window.confirm('¿Quitar esta fuente de la entidad?')) return;
    this.startSaving();
    this.api.deleteSourceRef(this.entityId, refId).subscribe({
      next: () => {
        this.sourcesSaving = false;
        this.sourceRefs = this.sourceRefs.filter((ref) => ref.id !== refId);
        this.sourcesMessage = 'Fuente eliminada.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo eliminar la fuente.'),
    });
  }

  private preparePayload(source: Partial<AdminEditableSourceRef | AdminSourceRefPayload>) {
    const result = buildSourceRefPayload(source, (value) => this.toNullableNumber(value));
    if (result.payload) return result.payload;
    this.sourcesError = result.error ?? 'No se pudo preparar la fuente.';
    this.emitState();
    return null;
  }

  private startSaving(): void {
    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;
    this.emitState();
  }

  private failSaving(error: { error?: { message?: string } } | null, fallback: string): void {
    this.sourcesSaving = false;
    this.sourcesError = error?.error?.message ?? fallback;
    this.emitState();
  }

  private emitState(): void {
    this.stateChange.emit({
      sourceRefs: this.sourceRefs.map((ref) => ({ ...ref })),
      saving: this.sourcesSaving,
      error: this.sourcesError,
    });
    this.cdr.markForCheck();
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
