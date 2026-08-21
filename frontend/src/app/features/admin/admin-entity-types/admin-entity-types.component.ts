import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EntityTypeDefinition, EntityTypesApi } from '../../../core/api/entity-types.api';
import {
  AttributeDefinition,
  AttributesApi,
  AttributeValueType,
} from '../../../core/api/attributes.api';

type EditableType = EntityTypeDefinition & { description: string };

@Component({
  standalone: true,
  selector: 'app-admin-entity-types',
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="types-page">
      <header>
        <div>
          <p>Configuración editorial</p>
          <h1>Tipos de entidad</h1>
          <span>Define cómo crece la biblioteca sin alterar sus tipos estructurales.</span>
        </div>
        <a routerLink="/admin/entities/new">Nueva pieza</a>
      </header>
      @if (message) {
        <p class="message" [class.error]="error">{{ message }}</p>
      }
      <section class="types-list" aria-label="Tipos de entidad">
        @for (type of types; track type.key) {
          <article class="type-row" [class.inactive]="type.status === 'INACTIVE'">
            <div class="type-row__mark" [style.--type-color]="color(type.colorToken)">
              {{ type.icon }}
            </div>
            <div class="type-row__summary">
              <strong>{{ type.singularName }}</strong
              ><span
                >{{ type.pluralName }} · {{ type._count?.entities || 0 }} entidades ·
                {{ statusLabel(type.status) }}</span
              ><small>{{ type.description || 'Sin descripción editorial.' }}</small>
            </div>
            <div class="type-row__actions">
              <button type="button" (click)="edit(type)">Gestionar</button>
              @if (!type.systemType) {
                <button type="button" (click)="toggle(type)">
                  {{ type.status === 'INACTIVE' ? 'Activar' : 'Desactivar' }}</button
                ><button class="danger" type="button" (click)="remove(type)">Eliminar</button>
              }
            </div>
          </article>
        }
      </section>
      @if (editing) {
        <section class="editor" aria-label="Gestionar tipo">
          <header>
            <div>
              <p>Tipo editorial</p>
              <h2>{{ editing.singularName }}</h2>
            </div>
            <button type="button" (click)="editing = null">Cerrar</button>
          </header>
          <div class="fields">
            <label>Nombre<input [(ngModel)]="editing.singularName" /></label
            ><label>Plural<input [(ngModel)]="editing.pluralName" /></label>
            <label
              >Identificador<input
                [(ngModel)]="editing.key"
                [disabled]="editing.systemType" /></label
            ><label>Inicial<input [(ngModel)]="editing.icon" maxlength="4" /></label>
            <label
              >Color<select [(ngModel)]="editing.colorToken">
                @for (item of colors; track item[0]) {
                  <option [value]="item[0]">{{ item[1] }}</option>
                }
              </select></label
            >
            <label
              >Naturaleza<select [(ngModel)]="editing.baseKind" [disabled]="editing.systemType">
                @for (item of kinds; track item[0]) {
                  <option [value]="item[0]">{{ item[1] }}</option>
                }
              </select></label
            >
            <label class="wide"
              >Descripción<textarea [(ngModel)]="editing.description" rows="3"></textarea>
            </label>
          </div>
          <section class="fields-config">
            <strong>Ficha contextual</strong><span>Campos que este tipo pide al editor.</span>
            <div class="configured-fields">
              @for (field of editing.fields || []; track field.attributeDefinitionId) {
                <label
                  ><input type="checkbox" [(ngModel)]="field.isRequired" />
                  {{ field.attributeDefinition.label }}
                  <small>{{ field.attributeDefinition.valueType }}</small
                  ><button type="button" (click)="removeField(field.attributeDefinitionId)">
                    Quitar
                  </button></label
                >
              }
            </div>
            <div>
              <select [(ngModel)]="fieldDefinitionId">
                <option value="">Añadir campo existente</option>
                @for (definition of definitions; track definition.id) {
                  <option [value]="definition.id">
                    {{ definition.label }} · {{ definition.valueType }}
                  </option>
                }</select
              ><button type="button" [disabled]="!fieldDefinitionId" (click)="addField()">
                Añadir
              </button>
            </div>
            <div class="new-field">
              <input
                [(ngModel)]="fieldLabel"
                placeholder="Nuevo campo, por ejemplo Plataforma"
              /><select [(ngModel)]="fieldValueType">
                @for (type of valueTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }</select
              ><button type="button" [disabled]="!fieldLabel.trim()" (click)="createField()">
                Crear campo
              </button>
            </div>
          </section>
          <button class="save" type="button" (click)="save()">Guardar cambios</button>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .types-page {
        width: min(1040px, 100%);
        margin: 0 auto;
        padding: 38px 28px;
        color: var(--color-text);
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: start;
      }
      header p {
        margin: 0 0 7px;
        color: var(--color-reference-accent);
        font-size: 12px;
        font-weight: 750;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      h1,
      h2 {
        margin: 0;
        font-weight: 540;
        letter-spacing: -0.035em;
      }
      h1 {
        font-size: 38px;
      }
      header span,
      .type-row span,
      .type-row small {
        color: var(--color-text-muted);
      }
      header > a,
      button {
        border: 1px solid var(--color-border-strong);
        border-radius: 9px;
        padding: 9px 12px;
        background: var(--color-surface-strong);
        color: var(--color-text);
        font: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      .types-list {
        display: grid;
        gap: 10px;
        margin-top: 30px;
      }
      .type-row {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 15px;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      }
      .type-row.inactive {
        opacity: 0.62;
      }
      .type-row__mark {
        --type-color: #94a3b8;
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--type-color) 55%, transparent);
        border-radius: 50%;
        color: var(--type-color);
      }
      .type-row__summary {
        display: grid;
        gap: 3px;
      }
      .type-row__summary small {
        font-size: 12px;
      }
      .type-row__actions {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        justify-content: end;
      }
      .danger {
        color: #df8c79;
      }
      .editor {
        display: grid;
        gap: 16px;
        margin-top: 22px;
        padding: 22px;
        border: 1px solid var(--color-border-strong);
        border-radius: 18px;
        background: var(--color-surface);
      }
      .editor h2 {
        font-size: 25px;
      }
      .fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .fields label {
        display: grid;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-soft);
      }
      input,
      select,
      textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--color-border-strong);
        border-radius: 9px;
        padding: 10px;
        background: var(--color-surface-strong);
        color: var(--color-text);
        font: inherit;
      }
      .wide {
        grid-column: 1/-1;
      }
      .fields-config {
        display: grid;
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
      }
      .fields-config > span {
        font-size: 13px;
      }
      .configured-fields {
        display: grid;
        gap: 6px;
      }
      .configured-fields label {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .configured-fields input {
        width: auto;
      }
      .configured-fields button {
        margin-left: auto;
        padding: 5px 8px;
      }
      .save {
        width: max-content;
      }
      .message {
        margin: 20px 0 0;
      }
      .error {
        color: #df8c79;
      }
      @media (max-width: 700px) {
        .types-page {
          padding: 22px 14px;
        }
        .type-row {
          grid-template-columns: 38px 1fr;
        }
        .type-row__actions {
          grid-column: 1/-1;
          justify-content: start;
        }
        .fields {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminEntityTypesComponent implements OnInit {
  private readonly api = inject(EntityTypesApi);
  private readonly attributesApi = inject(AttributesApi);
  private readonly cdr = inject(ChangeDetectorRef);
  types: EntityTypeDefinition[] = [];
  definitions: AttributeDefinition[] = [];
  editing: EditableType | null = null;
  fieldDefinitionId = '';
  fieldLabel = '';
  fieldValueType: AttributeValueType = 'TEXT';
  message = '';
  error = false;
  readonly colors = [
    ['slate', 'Neutro'],
    ['blue', 'Azul'],
    ['coral', 'Coral'],
    ['orange', 'Naranja'],
    ['green', 'Verde'],
    ['violet', 'Violeta'],
    ['gold', 'Oro'],
    ['teal', 'Turquesa'],
    ['rose', 'Rosa'],
  ];
  readonly kinds = [
    ['PERSON', 'Persona o agente'],
    ['WORK', 'Obra u objeto cultural'],
    ['ABSTRACTION', 'Concepto, técnica o idea'],
    ['PLACE', 'Lugar'],
    ['EVENT', 'Evento'],
    ['ORGANIZATION', 'Organización'],
  ];
  readonly valueTypes: AttributeValueType[] = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'YEAR', 'JSON'];
  ngOnInit() {
    this.load();
    this.attributesApi.definitions().subscribe({
      next: (definitions) => {
        this.definitions = definitions;
        this.cdr.markForCheck();
      },
    });
  }
  load() {
    this.api.list().subscribe({
      next: (types) => {
        this.types = types;
        this.cdr.markForCheck();
      },
      error: () => this.notice('No se pudieron cargar los tipos.', true),
    });
  }
  edit(type: EntityTypeDefinition) {
    this.editing = {
      ...type,
      description: type.description || '',
      fields: [...(type.fields || [])],
    };
    this.fieldDefinitionId = '';
  }
  addField() {
    if (
      !this.editing ||
      !this.fieldDefinitionId ||
      this.editing.fields?.some((field) => field.attributeDefinitionId === this.fieldDefinitionId)
    )
      return;
    const definition = this.definitions.find((item) => item.id === this.fieldDefinitionId);
    if (!definition) return;
    this.editing.fields = [
      ...(this.editing.fields || []),
      {
        attributeDefinitionId: definition.id,
        sortOrder: (this.editing.fields || []).length,
        isRequired: false,
        attributeDefinition: definition,
      },
    ];
    this.fieldDefinitionId = '';
  }
  removeField(id: string) {
    if (this.editing)
      this.editing.fields = (this.editing.fields || []).filter(
        (field) => field.attributeDefinitionId !== id,
      );
  }
  createField() {
    const label = this.fieldLabel.trim();
    if (!this.editing || !label) return;
    const key = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    this.attributesApi.createDefinition({ key, label, valueType: this.fieldValueType }).subscribe({
      next: (definition) => {
        this.definitions = [...this.definitions, definition];
        this.fieldDefinitionId = definition.id;
        this.fieldLabel = '';
        this.addField();
        this.cdr.markForCheck();
      },
      error: (e) => this.notice(e?.error?.message || 'No se pudo crear el campo.', true),
    });
  }
  save() {
    if (!this.editing) return;
    const current = this.editing;
    this.api
      .update(current.key, {
        singularName: current.singularName,
        pluralName: current.pluralName,
        description: current.description,
        icon: current.icon,
        colorToken: current.colorToken,
        baseKind: current.baseKind,
        key: current.key,
      })
      .subscribe({
        next: () =>
          this.api
            .replaceFields(
              current.key,
              (current.fields || []).map((field, index) => ({
                attributeDefinitionId: field.attributeDefinitionId,
                sortOrder: index,
                isRequired: field.isRequired,
              })),
            )
            .subscribe({
              next: () => {
                this.editing = null;
                this.notice('Tipo actualizado.');
                this.load();
              },
              error: (e) => this.notice(e?.error?.message || 'No se pudo guardar la ficha.', true),
            }),
        error: (e) => this.notice(e?.error?.message || 'No se pudo actualizar el tipo.', true),
      });
  }
  toggle(type: EntityTypeDefinition) {
    const status = type.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    this.api.update(type.key, { status }).subscribe({
      next: () => {
        this.notice(status === 'ACTIVE' ? 'Tipo activado.' : 'Tipo desactivado.');
        this.load();
      },
      error: (e) => this.notice(e?.error?.message || 'No se pudo actualizar el tipo.', true),
    });
  }
  remove(type: EntityTypeDefinition) {
    if (
      !confirm(
        `Eliminar “${type.singularName}”? Esta acción solo es posible si no tiene entidades.`,
      )
    )
      return;
    this.api.remove(type.key).subscribe({
      next: () => {
        this.notice('Tipo eliminado.');
        this.load();
      },
      error: (e) =>
        this.notice(e?.error?.message || 'Este tipo está en uso. Puedes desactivarlo.', true),
    });
  }
  color(token: string) {
    return (
      (
        {
          slate: '#94a3b8',
          blue: '#62b5ef',
          coral: '#ec8e77',
          orange: '#d98449',
          green: '#58c78d',
          violet: '#a57be4',
          gold: '#d8ab43',
          teal: '#54c2ce',
          rose: '#d585b8',
        } as Record<string, string>
      )[token] || '#94a3b8'
    );
  }
  statusLabel(status: string) {
    return (
      ({ ACTIVE: 'Activo', DRAFT: 'Borrador', INACTIVE: 'Inactivo' } as Record<string, string>)[
        status
      ] || status
    );
  }
  private notice(message: string, error = false) {
    this.message = message;
    this.error = error;
    this.cdr.markForCheck();
  }
}
