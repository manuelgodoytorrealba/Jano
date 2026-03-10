import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
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

  <section class="editor-layout">
    <!-- LEFT COLUMN -->
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
          <input
            type="text"
            [(ngModel)]="form.title"
            (ngModelChange)="onTitleChange($event)"
            name="title"
          />
        </label>

        <label class="field full">
          <span>Slug</span>
          <input
            type="text"
            [(ngModel)]="form.slug"
            (ngModelChange)="onSlugChange($event)"
            name="slug"
          />
          <small class="hint">URL amigable de la entity.</small>
        </label>

        <label class="field full">
          <span>Resumen</span>
          <textarea
            rows="5"
            [(ngModel)]="form.summary"
            name="summary"
          ></textarea>
        </label>

       <label class="field full content-field">
  <span>Contenido</span>
  <textarea
    #contentTextarea
    rows="14"
    [(ngModel)]="form.content"
    (input)="onContentInput()"
    (keydown.escape)="closeLinkSuggestions()"
    name="content"
  ></textarea>

  @if (showLinkSuggestions) {
    <div class="link-suggestions" (mousedown)="$event.preventDefault()">
      @if (linkLoading) {
        <div class="link-suggestion muted">Buscando entities…</div>
      } @else if (linkSuggestions.length) {
        @for (item of linkSuggestions; track item.id) {
          <button
            type="button"
            class="link-suggestion"
            (click)="insertEntityLink(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.type }} · {{ item.slug }}</span>
          </button>
        }
      } @else {
        <div class="link-suggestion muted">
          No se encontraron entities para "{{ linkSearch }}"
        </div>
      }
    </div>
  }
</label>
      </div>

      @if (isEdit) {
        <section class="relations-box">
          <div class="relations-head">
            <h3>Relaciones</h3>
            <p class="muted">Conecta esta entity con otras del sistema.</p>
          </div>

          <div class="relation-form">
            <label class="field full">
              <span>Buscar entity</span>
              <input
                type="text"
                [(ngModel)]="relationSearch"
                (input)="searchRelationTargets()"
                placeholder="Busca por título, slug o resumen..."
              />
            </label>

            @if (relationLoading) {
              <div class="muted">Buscando…</div>
            }

            @if (relationResults.length) {
              <div class="search-results">
                @for (item of relationResults; track item.id) {
                  <button
                    type="button"
                    class="search-item"
                    (click)="selectRelationTarget(item)"
                  >
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.type }}</span>
                  </button>
                }
              </div>
            }

            <label class="field">
              <span>Tipo de relación</span>
              <select [(ngModel)]="newRelation.type" name="newRelationType">
                @for (type of relationTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>

            <label class="field full">
              <span>Justificación (opcional)</span>
              <textarea
                rows="3"
                [(ngModel)]="newRelation.justification"
                name="newRelationJustification"
              ></textarea>
            </label>

            <div class="relations-actions">
              <button class="btn primary" type="button" (click)="addRelation()">
                Añadir relación
              </button>
            </div>
          </div>

          <div class="current-relations">
            <h4>Relaciones actuales</h4>

            @if (relationsLoading) {
              <div class="muted">Cargando relaciones…</div>
            } @else if (relations.length) {
              <div class="relations-list">
                @for (rel of relations; track rel.id) {
                  <article class="relation-card">
                    <div class="relation-main">
                      <div class="relation-type">{{ rel.type }}</div>
                      <div class="relation-target">
  <span class="relation-arrow">→</span>
  {{ rel.to?.title }}
  @if (rel.to?.type) {
    <span class="relation-meta">· {{ rel.to.type }}</span>
  }
</div>

                      @if (rel.justification) {
                        <div class="relation-note">{{ rel.justification }}</div>
                      }
                    </div>

                    <button
                      type="button"
                      class="btn danger"
                      (click)="removeRelation(rel.id)"
                    >
                      Quitar
                    </button>
                  </article>
                }
              </div>
            } @else {
              <div class="preview-empty">
                Esta entity aún no tiene relaciones salientes.
              </div>
            }
          </div>

          <div class="current-relations">
  <h4>Relaciones entrantes</h4>

  @if (incomingRelationsLoading) {
    <div class="muted">Cargando relaciones entrantes…</div>
  } @else if (incomingRelations.length) {
    <div class="relations-list">
      @for (rel of incomingRelations; track rel.id) {
        <article class="relation-card incoming">
          <div class="relation-main">
            <div class="relation-type">{{ rel.type }}</div>
            <div class="relation-target">
  <span class="relation-arrow incoming">←</span>
  {{ rel.from?.title }}
  @if (rel.from?.type) {
    <span class="relation-meta">· {{ rel.from.type }}</span>
  }
</div>

            @if (rel.justification) {
              <div class="relation-note">{{ rel.justification }}</div>
            }
          </div>
        </article>
      }
    </div>
  } @else {
    <div class="preview-empty">
      Esta entity aún no tiene relaciones entrantes.
    </div>
  }
</div>
        </section>
      }

      @if (errorMessage) {
        <div class="error-box">{{ errorMessage }}</div>
      }
      @if (successMessage) {
  <div class="success-box">{{ successMessage }}</div>
}

      <div class="actions">
  <a class="btn ghost" routerLink="/admin">Cancelar</a>

  <button
    class="btn ghost"
    type="button"
    [disabled]="saving || loading"
    (click)="submit('stay')"
  >
    @if (saving && submitMode === 'stay') {
      Guardando...
    } @else {
      Guardar y seguir
    }
  </button>

  <button
    class="btn primary"
    type="button"
    [disabled]="saving || loading"
    (click)="submit('back')"
  >
    @if (loading) {
      Cargando...
    } @else if (saving && submitMode === 'back') {
      Guardando...
    } @else {
      Guardar
    }
  </button>
</div>
    </section>

    <!-- RIGHT COLUMN -->
    <aside class="preview-wrap">
      <div class="preview-head">
        <h2>Preview</h2>
        <span class="preview-pill">{{ form.type }}</span>
      </div>

      <div class="preview-card">
        <div class="preview-badges">
          <span class="badge">{{ form.status }}</span>

          @if (form.contentLevel) {
            <span class="badge">{{ form.contentLevel }}</span>
          }

          @if (form.startYear || form.endYear) {
            <span class="badge">
              {{ form.startYear || '—' }}@if (form.endYear) {–{{ form.endYear }}}
            </span>
          }
        </div>

        <h3 class="preview-title">
          {{ form.title || 'Título de la entity' }}
        </h3>

        <div class="preview-slug">
          /entity/{{ form.slug || 'slug-de-la-entity' }}
        </div>

        @if (form.summary) {
          <div
  class="preview-summary"
  [innerHTML]="renderContentPreview(form.summary)"
></div>
        } @else {
          <div class="preview-empty">
            El resumen aparecerá aquí.
          </div>
        }

        <div class="preview-section-title">Contenido</div>

        @if (form.content) {
          <div
  class="preview-content"
  [innerHTML]="renderContentPreview(form.content)"
></div>
        } @else {
          <div class="preview-empty">
            El contenido principal aparecerá aquí.
          </div>
        }
      </div>
    </aside>
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

    .editor-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: 18px;
      align-items: start;
    }

    .form-wrap,
    .preview-wrap {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 20px;
      background: #fff;
      padding: 18px;
    }

    .form-wrap {
      display: grid;
      gap: 16px;
    }

    .preview-wrap {
      position: sticky;
      top: 20px;
      display: grid;
      gap: 14px;
    }

    .preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .preview-head h2 {
      margin: 0;
      font-size: 18px;
    }

    .preview-pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.8);
      color: rgba(0,0,0,.72);
    }

 
    .preview-card {
      border: 1px solid rgba(0,0,0,.06);
      border-radius: 18px;
      padding: 16px;
      display: grid;
      gap: 14px;
      background: linear-gradient(180deg, rgba(255,255,255,1), rgba(250,250,250,1));
    }

    .preview-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.75);
      color: rgba(0,0,0,.72);
      letter-spacing: .06em;
      text-transform: uppercase;
      width: fit-content;
    }

    .preview-title {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }

    .success-box {
  border: 1px solid rgba(0,128,0,.18);
  background: rgba(0,128,0,.05);
  color: #126b12;
  border-radius: 14px;
  padding: 12px;
  font-size: 14px;
}
    .preview-slug {
      font-size: 12px;
      color: #666;
      font-family: monospace;
      word-break: break-all;
    }

    .preview-summary {
      color: #222;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .preview-section-title {
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #666;
      font-weight: 700;
    }

    .preview-content {
      color: #222;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .preview-empty {
      color: #888;
      font-size: 14px;
      line-height: 1.5;
      border: 1px dashed rgba(0,0,0,.10);
      border-radius: 12px;
      padding: 12px;
      background: rgba(0,0,0,.015);
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

    .hint {
      color: #777;
      font-size: 12px;
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

        .relations-box {
      margin-top: 8px;
      border-top: 1px solid rgba(0,0,0,.08);
      padding-top: 18px;
      display: grid;
      gap: 16px;
    }

    .relations-head h3,
    .current-relations h4 {
      margin: 0;
    }

    .relation-form {
      display: grid;
      gap: 14px;
    }

    .relation-target {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.relation-arrow {
  font-size: 14px;
  opacity: 0.7;
}

.relation-arrow.incoming {
  color: #666;
}

.relation-meta {
  color: #666;
  font-weight: 400;
  font-size: 13px;
}

.current-relations h4 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.relations-list {
  display: grid;
  gap: 10px;
}

.entity-link {
  color: #111;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: rgba(0,0,0,.22);
  text-underline-offset: 2px;
  transition: color .12s ease, text-decoration-color .12s ease, opacity .12s ease;
  cursor: pointer;
}

.entity-link:hover {
  color: #000;
  text-decoration-color: #111;
}

.preview-content a,
.preview-summary a {
  pointer-events: auto;
}

.relation-card {
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  background: #fff;
  transition: all .15s ease;
}

.relation-card:hover {
  border-color: rgba(0,0,0,.15);
  background: rgba(0,0,0,.015);
}

.relation-card.incoming {
  background: rgba(0,0,0,.03);
}

    .search-results {
      display: grid;
      gap: 8px;
      max-height: 220px;
      overflow: auto;
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 12px;
      padding: 8px;
      background: #fafafa;
    }

    .search-item {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(0,0,0,.08);
      background: #fff;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      display: grid;
      gap: 4px;
    }

    .search-item span {
      font-size: 12px;
      color: #666;
    }

    .relations-actions {
      display: flex;
      justify-content: flex-start;
    }

    .relations-list {
      display: grid;
      gap: 10px;
    }

    .relation-card {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      background: #fff;
    }

    .relation-main {
      display: grid;
      gap: 6px;
    }

    .relation-type {
      font-size: 11px;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #666;
      font-weight: 700;
    }

    .relation-target {
      font-weight: 700;
    }

    .relation-target span {
      color: #666;
      font-weight: 500;
    }

    .relation-note {
      color: #666;
      font-size: 13px;
      line-height: 1.5;
    }

    .btn.danger {
      color: #b00020;
      border-color: rgba(176,0,32,.18);
    }

    @media (max-width: 1080px) {
      .editor-layout {
        grid-template-columns: 1fr;
      }

      .preview-wrap {
        position: static;
      }
    }

        .content-field {
      position: relative;
    }

    .link-suggestions {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 6px);
      z-index: 20;
      border: 1px solid rgba(0,0,0,.10);
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 18px 40px rgba(0,0,0,.10);
      overflow: hidden;
      display: grid;
      max-height: 260px;
      overflow-y: auto;
    }

    .link-suggestion {
      width: 100%;
      border: 0;
      background: #fff;
      text-align: left;
      padding: 12px 14px;
      cursor: pointer;
      display: grid;
      gap: 4px;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }

    .link-suggestion:last-child {
      border-bottom: 0;
    }

    .link-suggestion:hover {
      background: rgba(0,0,0,.03);
    }

    .link-suggestion span {
      font-size: 12px;
      color: #666;
    }

    .link-suggestion.muted {
      cursor: default;
      color: #666;
    }

    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminEntityFormComponent implements OnInit, OnDestroy {
  private adminApi = inject(AdminEntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('contentTextarea') contentTextarea?: ElementRef<HTMLTextAreaElement>;

  linkSuggestions: any[] = [];
  linkSearch = '';
  linkLoading = false;
  showLinkSuggestions = false;
  linkStartIndex = -1;

  successMessage = '';
  submitMode: 'back' | 'stay' = 'back';

  private linkSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  incomingRelations: any[] = [];
  incomingRelationsLoading = false;

  relationTypes = [
    'RELATES_TO',
    'INFLUENCED_BY',
    'PART_OF',
    'CREATED_BY',
    'REFERENCES',
  ];

  relations: any[] = [];
  relationSearch = '';
  relationResults: any[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation = {
    toId: '',
    type: 'RELATES_TO',
    justification: '',
  };

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
  slugTouched = false;

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

    this.linkSearch$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();

          if (q.length < 1) {
            return of({ items: [] });
          }

          this.linkLoading = true;
          this.cdr.markForCheck();

          return this.adminApi.list({
            q,
            limit: 8,
            page: 1,
            sort: 'title',
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res?.items) ? res.items : [];
          this.linkSuggestions = items;
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.linkSuggestions = [];
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
      });

    if (!this.isEdit || !this.entityId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.adminApi.getById(this.entityId).subscribe({
      next: (entity) => {
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

        this.slugTouched = true;
        this.loading = false;
        this.loadRelations();
        this.loadIncomingRelations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'No se pudo cargar la entity';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onTitleChange(value: string) {
    this.form.title = value;

    if (!this.slugTouched) {
      this.form.slug = this.slugify(value);
    }
  }

  onSlugChange(value: string) {
    this.slugTouched = true;
    this.form.slug = this.slugify(value);
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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

  submit(mode: 'back' | 'stay' = 'back') {
    this.errorMessage = '';
    this.successMessage = '';
    this.submitMode = mode;

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
      next: (entity) => {
        this.saving = false;
        this.successMessage = this.isEdit
          ? 'Entity actualizada correctamente.'
          : 'Entity creada correctamente.';

        this.cdr.markForCheck();

        if (mode === 'stay') {
          if (!this.isEdit && entity?.id) {
            this.router.navigate(['/admin/entities', entity.id, 'edit']);
          }
          return;
        }

        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 700);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message ?? 'No se pudo guardar la entity';
        this.cdr.markForCheck();
      },
    });
  }

  loadRelations() {
    if (!this.entityId) return;

    this.relationsLoading = true;

    this.adminApi.listRelations(this.entityId).subscribe({
      next: (rows) => {
        this.relations = rows;
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relations = [];
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadIncomingRelations() {
    if (!this.entityId) return;

    this.incomingRelationsLoading = true;

    this.adminApi.listIncomingRelations(this.entityId).subscribe({
      next: (rows) => {
        this.incomingRelations = rows;
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.incomingRelations = [];
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  searchRelationTargets() {
    const q = this.relationSearch.trim();

    if (!q || q.length < 2) {
      this.relationResults = [];
      this.cdr.markForCheck();
      return;
    }

    this.relationLoading = true;

    this.adminApi.list({
      q,
      limit: 12,
      page: 1,
      sort: 'title',
    }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.items) ? res.items : [];
        this.relationResults = items.filter((item: any) => item.id !== this.entityId);
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationResults = [];
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectRelationTarget(entity: any) {
    this.newRelation.toId = entity.id;
    this.relationSearch = `${entity.title} (${entity.type})`;
    this.relationResults = [];
    this.cdr.markForCheck();
  }

  addRelation() {
    if (!this.entityId || !this.newRelation.toId || !this.newRelation.type.trim()) {
      return;
    }

    this.adminApi.createRelation(this.entityId, {
      toId: this.newRelation.toId,
      type: this.newRelation.type.trim(),
      justification: this.newRelation.justification.trim() || undefined,
    }).subscribe({
      next: () => {
        this.newRelation = {
          toId: '',
          type: 'RELATES_TO',
          justification: '',
        };
        this.relationSearch = '';
        this.relationResults = [];
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la relación';
        this.cdr.markForCheck();
      },
    });
  }

  removeRelation(relationId: string) {
    if (!this.entityId) return;

    const ok = window.confirm('¿Quitar esta relación?');
    if (!ok) return;

    this.adminApi.deleteRelation(this.entityId, relationId).subscribe({
      next: () => {
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo borrar la relación';
        this.cdr.markForCheck();
      },
    });
  }

  onContentInput() {
    const value = this.form.content ?? '';
    const textarea = this.contentTextarea?.nativeElement;

    if (!textarea) {
      this.closeLinkSuggestions();
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);

    const match = beforeCursor.match(/\[\[([^[\]]*)$/);

    if (!match) {
      this.closeLinkSuggestions();
      return;
    }

    const query = (match[1] ?? '').trim();
    const startIndex = beforeCursor.lastIndexOf('[[');

    if (query.includes(']]')) {
      this.closeLinkSuggestions();
      return;
    }

    this.linkStartIndex = startIndex;
    this.linkSearch = query;
    this.showLinkSuggestions = true;

    if (query.length < 1) {
      this.linkSuggestions = [];
      this.linkLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.linkSearch$.next(query);
  }

  insertEntityLink(entity: any) {
    const textarea = this.contentTextarea?.nativeElement;
    const value = this.form.content ?? '';

    if (!textarea || this.linkStartIndex < 0) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, this.linkStartIndex);
    const after = value.slice(cursor);

    const inserted = `[[${entity.slug}|${entity.title}]]`;
    const nextValue = `${before}${inserted}${after}`;

    this.form.content = nextValue;
    this.closeLinkSuggestions();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      if (!textarea) return;
      textarea.focus();

      const nextCursor = before.length + inserted.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  closeLinkSuggestions() {
    this.linkSuggestions = [];
    this.linkSearch = '';
    this.linkLoading = false;
    this.showLinkSuggestions = false;
    this.linkStartIndex = -1;
    this.cdr.markForCheck();
  }

  renderContentPreview(text: string | null | undefined): string {
    if (!text) return '';

    const escaped = text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    const withLinks = escaped.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_match, slug, label) => {
        const safeSlug = String(slug).trim();
        const safeLabel = String(label ?? slug).trim();

        return `<a class="entity-link" href="/entity/${safeSlug}">${safeLabel}</a>`;
      },
    );

    return withLinks.replace(/\n/g, '<br>');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}