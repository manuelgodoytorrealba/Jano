import { ChangeDetectionStrategy, Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminEntitiesApi, AdminEntityPayload } from '../../core/api/admin-entities.api';

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="top">
        <div>
          <h1>{{ isEdit ? 'Editar entity' : 'Nueva entity' }}</h1>
          <p class="muted">Administra el contenido principal de JANO.</p>
        </div>

        <div class="top-actions">
          <a class="btn ghost" routerLink="/admin">Volver</a>
        </div>
      </header>

      @if (loadError) {
        <div class="error-box">{{ loadError }}</div>
      }

      <section class="form-wrap">
        <div class="grid">
          <label class="field">
            <span>Tipo</span>
            <select [(ngModel)]="form.type" name="type">
              @for (type of types; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Status</span>
            <select [(ngModel)]="form.status" name="status">
              @for (status of statuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Nivel</span>
            <select [(ngModel)]="form.contentLevel" name="contentLevel">
              <option value="">—</option>
              @for (level of levels; track level) {
                <option [value]="level">{{ level }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Año inicio</span>
            <input type="number" [(ngModel)]="form.startYear" name="startYear" />
          </label>

          <label class="field">
            <span>Año fin</span>
            <input type="number" [(ngModel)]="form.endYear" name="endYear" />
          </label>

          <div></div>

          <label class="field full">
            <span>Título</span>
            <input type="text" [(ngModel)]="form.title" name="title" />
          </label>

          <label class="field full">
            <span>Slug</span>
            <input type="text" [(ngModel)]="form.slug" name="slug" />
          </label>

          <label class="field full">
            <span>Resumen</span>
            <textarea rows="4" [(ngModel)]="form.summary" name="summary"></textarea>
          </label>

          <label class="field full">
            <span>Contenido</span>
            <textarea rows="12" [(ngModel)]="form.content" name="content"></textarea>
          </label>
        </div>

        @if (errorMessage) {
          <div class="error-box">{{ errorMessage }}</div>
        }

        <div class="actions">
          <a class="btn ghost" routerLink="/admin">Cancelar</a>
          <button class="btn primary" type="button" [disabled]="saving || loading" (click)="submit()">
            @if (loading) { Cargando... }
            @else if (saving) { Guardando... }
            @else { Guardar }
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { padding: 28px; }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 18px;
    }

    h1 { margin: 0; }
    .muted { margin: 6px 0 0; color: #666; }

    .top-actions {
      display: flex;
      gap: 10px;
    }

    .form-wrap {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 20px;
      background: #fff;
      padding: 18px;
      display: grid;
      gap: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    .field.full {
      grid-column: 1 / -1;
    }

    .field span {
      font-size: 13px;
      color: #555;
      font-weight: 700;
    }

    input, select, textarea {
      width: 100%;
      border: 1px solid rgba(0,0,0,.10);
      border-radius: 12px;
      padding: 12px;
      font: inherit;
      background: #fff;
      outline: none;
    }

    textarea {
      resize: vertical;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
      text-decoration: none;
      color: #111;
      display: inline-flex;
      align-items: center;
    }

    .btn.primary {
      background: #111;
      color: #fff;
      border-color: #111;
    }

    .error-box {
      border: 1px solid rgba(176,0,32,.18);
      background: rgba(176,0,32,.05);
      color: #b00020;
      border-radius: 14px;
      padding: 12px;
      font-size: 14px;
    }

    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminEntityFormComponent implements OnInit {
  private adminApi = inject(AdminEntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  types: AdminEntityPayload['type'][] = [
    'ARTWORK',
    'ARTIST',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];

  statuses: NonNullable<AdminEntityPayload['status']>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];

  levels: NonNullable<AdminEntityPayload['contentLevel']>[] = [
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  saving = false;
  loading = false;
  errorMessage = '';
  loadError = '';

  isEdit = false;
  entityId = '';

  form: {
    type: AdminEntityPayload['type'];
    title: string;
    slug: string;
    summary: string;
    content: string;
    contentLevel: '' | NonNullable<AdminEntityPayload['contentLevel']>;
    status: NonNullable<AdminEntityPayload['status']>;
    startYear: number | null | string;
    endYear: number | null | string;
  } = {
    type: 'ARTWORK',
    title: '',
    slug: '',
    summary: '',
    content: '',
    contentLevel: '',
    status: 'DRAFT',
    startYear: null,
    endYear: null,
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    this.entityId = id ?? '';

    if (!this.isEdit || !this.entityId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.adminApi.getById(this.entityId).subscribe({
      next: (entity) => {
        console.log('Entity loaded for edit:', entity);

        this.form = {
          type: entity.type ?? 'ARTWORK',
          title: entity.title ?? '',
          slug: entity.slug ?? '',
          summary: entity.summary ?? '',
          content: entity.content ?? '',
          contentLevel: entity.contentLevel ?? '',
          status: entity.status ?? 'DRAFT',
          startYear: entity.startYear ?? null,
          endYear: entity.endYear ?? null,
        };

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Load entity error:', err);
        this.loadError = err?.error?.message ?? 'No se pudo cargar la entity';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildPayload(): AdminEntityPayload {
    return {
      type: this.form.type,
      title: (this.form.title ?? '').trim(),
      slug: (this.form.slug ?? '').trim(),
      summary: (this.form.summary ?? '').trim() || undefined,
      content: (this.form.content ?? '').trim() || undefined,
      contentLevel: this.form.contentLevel || undefined,
      status: this.form.status || undefined,
      startYear:
        this.form.startYear !== null && this.form.startYear !== ''
          ? Number(this.form.startYear)
          : undefined,
      endYear:
        this.form.endYear !== null && this.form.endYear !== ''
          ? Number(this.form.endYear)
          : undefined,
    };
  }

  submit() {
    this.errorMessage = '';

    const payload = this.buildPayload();

    if (!payload.title || !payload.slug || !payload.type) {
      this.errorMessage = 'Título, slug y tipo son obligatorios.';
      return;
    }

    this.saving = true;

    const req$ = this.isEdit
      ? this.adminApi.update(this.entityId, payload)
      : this.adminApi.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message ?? 'No se pudo guardar la entity';
      },
    });
  }
}