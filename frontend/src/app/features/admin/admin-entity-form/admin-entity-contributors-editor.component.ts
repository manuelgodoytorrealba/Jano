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
import { AdminContributorPayload, AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import {
  AdminEditableContributor,
  buildContributorPayload,
  createEmptyContributorDraft,
  normalizeContributor,
  upsertContributor,
} from './admin-entity-metadata.presenter';

export type AdminEntityContributorsState = {
  contributors: AdminEditableContributor[];
  saving: boolean;
  error: string;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-contributors-editor',
  imports: [FormsModule],
  templateUrl: './admin-entity-contributors-editor.component.html',
  styleUrls: ['./admin-entity-metadata-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityContributorsEditorComponent implements OnChanges {
  private readonly api = inject(AdminEntitiesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input() active = false;
  @Input() contributors: AdminEditableContributor[] = [];
  @Output() stateChange = new EventEmitter<AdminEntityContributorsState>();

  newContributor: AdminContributorPayload = createEmptyContributorDraft();
  contributorsSaving = false;
  contributorsMessage = '';
  contributorsError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contributors']) {
      this.contributors = this.contributors.map((contributor) => ({ ...contributor }));
    }
  }

  emitDraft(): void {
    this.emitState();
  }

  addContributor(): void {
    if (!this.entityId || this.contributorsSaving) return;
    const payload = this.preparePayload(this.newContributor);
    if (!payload) return;
    this.startSaving();
    this.api.createContributor(this.entityId, payload).subscribe({
      next: (contributor) => {
        this.contributorsSaving = false;
        this.contributors = [...this.contributors, normalizeContributor(contributor)];
        this.newContributor = createEmptyContributorDraft();
        this.contributorsMessage = 'Colaborador añadido correctamente.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo añadir el colaborador.'),
    });
  }

  saveContributor(contributor: AdminEditableContributor): void {
    if (!this.entityId || this.contributorsSaving) return;
    const payload = this.preparePayload(contributor);
    if (!payload) return;
    this.startSaving();
    this.api.updateContributor(this.entityId, contributor.id, payload).subscribe({
      next: (updated) => {
        this.contributorsSaving = false;
        this.contributors = upsertContributor(this.contributors, normalizeContributor(updated));
        this.contributorsMessage = 'Colaborador actualizado correctamente.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo actualizar el colaborador.'),
    });
  }

  removeContributor(contributorId: string): void {
    if (!this.entityId || this.contributorsSaving) return;
    if (!window.confirm('¿Quitar este colaborador?')) return;
    this.startSaving();
    this.api.deleteContributor(this.entityId, contributorId).subscribe({
      next: () => {
        this.contributorsSaving = false;
        this.contributors = this.contributors.filter((item) => item.id !== contributorId);
        this.contributorsMessage = 'Colaborador eliminado.';
        this.emitState();
      },
      error: (error) => this.failSaving(error, 'No se pudo eliminar el colaborador.'),
    });
  }

  private preparePayload(source: Partial<AdminEditableContributor | AdminContributorPayload>) {
    const result = buildContributorPayload(source);
    if (result.payload) return result.payload;
    this.contributorsError = result.error ?? 'No se pudo preparar el colaborador.';
    this.emitState();
    return null;
  }

  private startSaving(): void {
    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;
    this.emitState();
  }

  private failSaving(error: { error?: { message?: string } } | null, fallback: string): void {
    this.contributorsSaving = false;
    this.contributorsError = error?.error?.message ?? fallback;
    this.emitState();
  }

  private emitState(): void {
    this.stateChange.emit({
      contributors: this.contributors.map((contributor) => ({ ...contributor })),
      saving: this.contributorsSaving,
      error: this.contributorsError,
    });
    this.cdr.markForCheck();
  }
}
