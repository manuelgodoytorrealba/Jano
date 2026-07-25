import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminCitationsEditorComponent } from './admin-citations-editor.component';
import {
  AttributeDefinition,
  CreateAttributeDefinitionPayload,
  AttributesApi,
  AttributeValueType,
  EntityAttribute,
  EntityAttributeMutationPayload,
  KnowledgeAssertionStatus,
} from '../../../core/api/attributes.api';

@Component({
  standalone: true,
  selector: 'app-admin-entity-attributes-editor',
  imports: [FormsModule, AdminCitationsEditorComponent],
  templateUrl: './admin-entity-attributes-editor.component.html',
  styleUrls: ['./admin-entity-attributes-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityAttributesEditorComponent implements OnChanges {
  private readonly api = inject(AttributesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';

  definitions: AttributeDefinition[] = [];
  attributes: EntityAttribute[] = [];
  definitionId = '';
  value = '';
  status: KnowledgeAssertionStatus = 'DRAFT';
  confidence: number | null = null;
  validFromYear: number | null = null;
  validToYear: number | null = null;
  editingId = '';
  creatingDefinition = false;
  definitionKey = '';
  definitionLabel = '';
  definitionValueType: AttributeValueType = 'TEXT';
  definitionMultiple = false;
  definitionSaving = false;
  readonly definitionValueTypes: AttributeValueType[] = [
    'TEXT',
    'NUMBER',
    'BOOLEAN',
    'DATE',
    'YEAR',
    'JSON',
  ];
  saving = false;
  message = '';
  error = '';

  ngOnChanges(): void {
    if (this.entityId) this.load();
  }

  selectedDefinition(): AttributeDefinition | null {
    return this.definitions.find((definition) => definition.id === this.definitionId) ?? null;
  }

  selectedValueType(): AttributeValueType | null {
    return this.selectedDefinition()?.valueType ?? null;
  }

  onDefinitionChange(): void {
    if (this.selectedValueType() === 'BOOLEAN' && !this.value) this.value = 'true';
  }

  save(): void {
    const definition = this.selectedDefinition();
    if (!definition || this.saving) return;

    const payload = this.payloadFor(definition);
    if (!payload) {
      this.error = 'Introduce un valor válido para esta definición.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.message = '';
    this.error = '';
    const request = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(this.entityId, { ...payload, definitionId: definition.id });
    request.subscribe({
      next: (attribute) => {
        this.attributes = this.editingId
          ? this.attributes.map((item) => (item.id === attribute.id ? attribute : item))
          : [...this.attributes, attribute];
        this.message = this.editingId ? 'Atributo actualizado.' : 'Atributo añadido.';
        this.reset();
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message ?? 'No se pudo guardar el atributo.';
        this.cdr.markForCheck();
      },
    });
  }

  createDefinition(): void {
    const payload: CreateAttributeDefinitionPayload = {
      key: this.definitionKey.trim(),
      label: this.definitionLabel.trim(),
      valueType: this.definitionValueType,
      isMultiple: this.definitionMultiple,
    };
    if (!payload.key || !payload.label || this.definitionSaving) return;

    this.definitionSaving = true;
    this.error = '';
    this.api.createDefinition(payload).subscribe({
      next: (definition) => {
        this.definitions = [...this.definitions, definition].sort((a, b) =>
          a.label.localeCompare(b.label),
        );
        this.definitionId = definition.id;
        this.creatingDefinition = false;
        this.definitionKey = '';
        this.definitionLabel = '';
        this.definitionValueType = 'TEXT';
        this.definitionMultiple = false;
        this.definitionSaving = false;
        this.message = 'Definición creada.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.definitionSaving = false;
        this.error = error?.error?.message ?? 'No se pudo crear la definición.';
        this.cdr.markForCheck();
      },
    });
  }

  edit(attribute: EntityAttribute): void {
    this.editingId = attribute.id;
    this.definitionId = attribute.definition.id;
    this.value = this.valueFor(attribute);
    this.status = attribute.status;
    this.confidence = attribute.confidence ?? null;
    this.validFromYear = attribute.validFromYear ?? null;
    this.validToYear = attribute.validToYear ?? null;
    this.message = '';
    this.error = '';
  }

  cancel(): void {
    this.reset();
  }

  remove(attribute: EntityAttribute): void {
    if (this.saving) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.api.remove(attribute.id).subscribe({
      next: () => {
        this.attributes = this.attributes.filter((item) => item.id !== attribute.id);
        if (this.editingId === attribute.id) this.reset();
        this.saving = false;
        this.message = 'Atributo eliminado.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message ?? 'No se pudo eliminar el atributo.';
        this.cdr.markForCheck();
      },
    });
  }

  valueLabel(attribute: EntityAttribute): string {
    return this.valueFor(attribute) || '—';
  }

  private load(): void {
    this.api.definitions().subscribe({
      next: (definitions) => {
        this.definitions = definitions;
        this.cdr.markForCheck();
      },
      error: () => {
        this.definitions = [];
        this.cdr.markForCheck();
      },
    });
    this.api.list(this.entityId).subscribe({
      next: (attributes) => {
        this.attributes = attributes;
        this.cdr.markForCheck();
      },
      error: () => {
        this.attributes = [];
        this.cdr.markForCheck();
      },
    });
  }

  private payloadFor(definition: AttributeDefinition): EntityAttributeMutationPayload | null {
    const value = this.value.trim();
    const payload: EntityAttributeMutationPayload = {
      status: this.status,
      confidence: this.confidence,
      validFromYear: this.validFromYear,
      validToYear: this.validToYear,
    };

    switch (definition.valueType) {
      case 'TEXT':
        return value ? { ...payload, valueText: value } : null;
      case 'NUMBER': {
        const number = Number(value);
        return value && Number.isFinite(number) ? { ...payload, valueNumber: number } : null;
      }
      case 'BOOLEAN':
        return value ? { ...payload, valueBoolean: value === 'true' } : null;
      case 'DATE':
        return value ? { ...payload, valueDate: value } : null;
      case 'YEAR': {
        const year = Number(value);
        return value && Number.isInteger(year) ? { ...payload, valueYear: year } : null;
      }
      case 'JSON':
        try {
          return value ? { ...payload, valueJson: JSON.parse(value) } : null;
        } catch {
          return null;
        }
    }
  }

  private valueFor(attribute: EntityAttribute): string {
    if (attribute.valueText !== null && attribute.valueText !== undefined)
      return attribute.valueText;
    if (attribute.valueNumber !== null && attribute.valueNumber !== undefined)
      return String(attribute.valueNumber);
    if (attribute.valueBoolean !== null && attribute.valueBoolean !== undefined)
      return String(attribute.valueBoolean);
    if (attribute.valueDate) return attribute.valueDate.slice(0, 10);
    if (attribute.valueYear !== null && attribute.valueYear !== undefined)
      return String(attribute.valueYear);
    return attribute.valueJson ? JSON.stringify(attribute.valueJson) : '';
  }

  private reset(): void {
    this.editingId = '';
    this.definitionId = '';
    this.value = '';
    this.confidence = null;
    this.validFromYear = null;
    this.validToYear = null;
    this.status = 'DRAFT';
  }
}
