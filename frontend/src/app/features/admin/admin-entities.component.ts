import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { AdminEntitiesApi } from '../../core/api/admin-entities.api';

type AdminType = '' | 'ARTWORK' | 'ARTIST' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'TEXT' | 'PLACE';
type AdminStatus = '' | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';

@Component({
  standalone: true,
  selector: 'app-admin-entities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="top">
        <div>
          <h1>Admin · Entities</h1>
          <p class="muted">Gestiona el contenido de JANO.</p>
        </div>

        <div class="top-actions">
          <a class="btn ghost" routerLink="/">Volver al sitio</a>
          <a class="btn primary" routerLink="/admin/entities/new">Nueva entity</a>
        </div>
      </header>

      <section class="filters-card">
        <div class="filters-grid">
          <label class="field field-search">
            <span>Buscar</span>
            <input
              type="text"
              [(ngModel)]="search"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Título, resumen o contenido..."
            />
          </label>

          <label class="field">
            <span>Tipo</span>
            <select [(ngModel)]="selectedType" (ngModelChange)="refresh()">
              <option value="">Todos</option>
              @for (type of types; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Status</span>
            <select [(ngModel)]="selectedStatus" (ngModelChange)="refresh()">
              <option value="">Todos</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </label>

          <div class="filters-actions">
            <button class="btn ghost" type="button" (click)="resetFilters()">
              Reset
            </button>
          </div>
        </div>
      </section>

      @if (vm$ | async; as vm) {
        <section class="meta">
          <div class="meta-left">
            <span class="pill">{{ vm.total ?? 0 }} entities</span>

            @if (hasActiveFilters()) {
              <span class="pill subtle">Filtros activos</span>
            }
          </div>

          @if (feedbackMessage) {
            <span class="pill success">{{ feedbackMessage }}</span>
          }
        </section>

        @if (loading) {
          <div class="loading-box">Cargando entities…</div>
        } @else if ((vm.items?.length ?? 0) > 0) {
          <section class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Nivel</th>
                  <th>Slug</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                @for (item of vm.items; track item.id) {
                  <tr>
                    <td>
                      <div class="title-cell">
                        <div class="title">{{ item.title }}</div>
                        @if (item.summary) {
                          <div class="summary">{{ item.summary }}</div>
                        }
                      </div>
                    </td>

                    <td>
                      <span class="mini-pill">{{ item.type }}</span>
                    </td>

                    <td>
                      <span class="mini-pill">{{ item.status }}</span>
                    </td>

                    <td>
                      <span class="mini-pill">{{ item.contentLevel || '—' }}</span>
                    </td>

                    <td class="slug">{{ item.slug }}</td>

                    <td>
                      <div class="row-actions">
                        <a class="mini" [routerLink]="['/entity', item.slug]">Ver</a>
                        <a class="mini" [routerLink]="['/admin/entities', item.id, 'edit']">Editar</a>
                        <button
                          class="mini danger"
                          type="button"
                          [disabled]="deletingId === item.id"
                          (click)="remove(item.id, item.title)"
                        >
                          @if (deletingId === item.id) { Borrando... } @else { Borrar }
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        } @else {
          <div class="empty">
            <div class="empty-title">No hay resultados</div>
            <div class="empty-sub">
              Ajusta la búsqueda o los filtros, o crea una nueva entity.
            </div>
          </div>
        }
      } @else {
        <div class="loading-box">Cargando…</div>
      }
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
      flex-wrap: wrap;
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
      justify-content: center;
    }

    .btn.primary {
      background: #111;
      color: #fff;
      border-color: #111;
    }

    .filters-card {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      background: #fff;
      padding: 16px;
      margin-bottom: 14px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(160px, .7fr)) auto;
      gap: 12px;
      align-items: end;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    .field span {
      font-size: 12px;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #666;
      font-weight: 700;
    }

    input, select {
      height: 42px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      padding: 0 12px;
      font: inherit;
      outline: none;
    }

    .filters-actions {
      display: flex;
      align-items: end;
      gap: 10px;
    }

    .pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.8);
      color: rgba(0,0,0,.72);
      width: fit-content;
    }

    .pill.subtle {
      background: rgba(0,0,0,.03);
    }

    .pill.success {
      border-color: rgba(0,128,0,.14);
      background: rgba(0,128,0,.06);
      color: #126b12;
    }

    .meta {
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .meta-left {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .loading-box,
    .empty {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      background: #fff;
      padding: 18px;
    }

    .loading-box { color: #666; }

    .empty-title { font-weight: 800; }
    .empty-sub { margin-top: 6px; color: #666; }

    .table-wrap {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      overflow: hidden;
      background: #fff;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th,
    .table td {
      padding: 14px;
      border-bottom: 1px solid rgba(0,0,0,.06);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }

    .table th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #666;
      background: #fafafa;
    }

    .title-cell { display: grid; gap: 4px; }
    .title { font-weight: 800; }
    .summary {
      color: #666;
      font-size: 13px;
      max-width: 42ch;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .slug {
      color: #666;
      font-family: monospace;
      font-size: 12px;
    }

    .mini-pill {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      padding: 5px 8px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(0,0,0,.03);
      color: rgba(0,0,0,.72);
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .row-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mini {
      height: 32px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
      text-decoration: none;
      color: #111;
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      justify-content: center;
    }

    .mini.danger {
      color: #b00020;
      border-color: rgba(176,0,32,.18);
    }

    .mini:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    @media (max-width: 1100px) {
      .filters-grid {
        grid-template-columns: 1fr 1fr;
      }

      .field-search {
        grid-column: 1 / -1;
      }

      .filters-actions {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 900px) {
      .table-wrap {
        overflow-x: auto;
      }

      .table {
        min-width: 900px;
      }
    }

    @media (max-width: 640px) {
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminEntitiesComponent {
  private api = inject(AdminEntitiesApi);

  types: Exclude<AdminType, ''>[] = [
    'ARTWORK',
    'ARTIST',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];

  statuses: Exclude<AdminStatus, ''>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];

  search = '';
  selectedType: AdminType = '';
  selectedStatus: AdminStatus = '';

  loading = false;
  deletingId = '';
  feedbackMessage = '';

  private refresh$ = new BehaviorSubject<void>(undefined);
  private search$ = new BehaviorSubject<string>('');

  vm$ = combineLatest([
    this.refresh$,
    this.search$.pipe(
      debounceTime(220),
      distinctUntilChanged(),
      startWith(''),
    ),
  ]).pipe(
    switchMap(([_, q]) => {
      this.loading = true;
      this.feedbackMessage = '';

      return this.api.list({
        page: 1,
        limit: 60,
        sort: 'recent',
        q: q.trim() || undefined,
        type: this.selectedType || undefined,
        status: this.selectedStatus || undefined,
      }).pipe(
        map((res) => {
          this.loading = false;
          return res;
        }),
        catchError(() => {
          this.loading = false;
          return of({ items: [], total: 0 });
        }),
      );
    }),
  );

  onSearchChange(value: string) {
    this.search$.next(value ?? '');
  }

  refresh() {
    this.refresh$.next();
  }

  resetFilters() {
    this.search = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.search$.next('');
    this.refresh();
  }

  hasActiveFilters() {
    return !!(this.search.trim() || this.selectedType || this.selectedStatus);
  }

  remove(id: string, title: string) {
    const ok = window.confirm(`¿Borrar "${title}"?`);
    if (!ok) return;

    this.deletingId = id;
    this.feedbackMessage = '';

    this.api.remove(id).subscribe({
      next: () => {
        this.deletingId = '';
        this.feedbackMessage = 'Entity eliminada';
        this.refresh();
      },
      error: () => {
        this.deletingId = '';
        this.feedbackMessage = 'No se pudo borrar la entity';
      },
    });
  }
}