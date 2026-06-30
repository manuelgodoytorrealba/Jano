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
import {
  AdminEntitiesApi,
  AdminEntityDetailsPayload,
  AdminEntityPayload,
  AdminEntityResponse,
} from '../../../core/api/admin-entities.api';
import { extractEntityDetails } from './admin-entity-content.presenter';

@Component({
  standalone: true,
  selector: 'app-admin-entity-details-editor',
  imports: [FormsModule],
  templateUrl: './admin-entity-details-editor.component.html',
  styleUrls: ['./admin-entity-metadata-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityDetailsEditorComponent implements OnChanges {
  private readonly api = inject(AdminEntitiesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input({ required: true }) entityType: AdminEntityPayload['type'] = 'ARTWORK';
  @Input() details: AdminEntityDetailsPayload = {};
  @Output() detailsChange = new EventEmitter<AdminEntityDetailsPayload>();
  @Output() statusChange = new EventEmitter<{ saving: boolean; error: string }>();
  @Output() saved = new EventEmitter<AdminEntityResponse>();

  saving = false;
  message = '';
  error = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['details']) this.details = { ...this.details };
  }

  get title(): string {
    return this.entityType === 'ARTWORK'
      ? 'Ficha de obra'
      : this.entityType === 'ARTIST'
        ? 'Ficha de artista'
        : this.entityType === 'CONCEPT'
          ? 'Ficha de concepto'
          : this.entityType === 'PERIOD'
            ? 'Ficha de periodo'
            : 'Ficha específica';
  }

  emitDraft(): void {
    this.detailsChange.emit({ ...this.details });
  }

  save(): void {
    if (!this.entityId || this.saving) return;
    this.error = '';
    this.message = '';
    this.saving = true;
    this.emitStatus();
    this.api.updateDetails(this.entityId, this.payload()).subscribe({
      next: (entity) => {
        this.saving = false;
        this.details = extractEntityDetails(entity);
        this.message = 'Ficha específica actualizada correctamente.';
        this.detailsChange.emit({ ...this.details });
        this.emitStatus();
        this.saved.emit(entity);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message ?? 'No se pudo actualizar la ficha específica.';
        this.emitStatus();
        this.cdr.markForCheck();
      },
    });
  }

  private payload(): AdminEntityDetailsPayload {
    const text = (value?: string) => value?.trim() || undefined;
    return {
      authorNation: text(this.details.authorNation),
      technique: text(this.details.technique),
      materials: text(this.details.materials),
      dimensions: text(this.details.dimensions),
      location: text(this.details.location),
      collection: text(this.details.collection),
      state: text(this.details.state),
      country: text(this.details.country),
      city: text(this.details.city),
      birthYear: this.number(this.details.birthYear),
      deathYear: this.number(this.details.deathYear),
      disciplines: text(this.details.disciplines),
      bioShort: text(this.details.bioShort),
      links: text(this.details.links),
      definition: text(this.details.definition),
    };
  }

  private number(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private emitStatus(): void {
    this.statusChange.emit({ saving: this.saving, error: this.error });
  }
}
