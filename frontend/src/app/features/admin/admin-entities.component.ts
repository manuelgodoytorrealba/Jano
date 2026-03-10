import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';
import { AdminEntitiesApi } from '../../core/api/admin-entities.api';

@Component({
  standalone: true,
  selector: 'app-admin-entities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
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

      @if (vm$ | async; as vm) {
        <section class="meta">
          <span class="pill">{{ vm.total ?? 0 }} entities</span>
        </section>

        @if ((vm.items?.length ?? 0) > 0) {
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
                    <td>{{ item.type }}</td>
                    <td>{{ item.status }}</td>
                    <td>{{ item.contentLevel || '—' }}</td>
                    <td class="slug">{{ item.slug }}</td>
                    <td>
                      <div class="row-actions">
                        <a class="mini" [routerLink]="['/entity', item.slug]">Ver</a>
                        <a class="mini" [routerLink]="['/admin/entities', item.id, 'edit']">Editar</a>
                        <button class="mini danger" type="button" (click)="remove(item.id, item.title)">
                          Borrar
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
            <div class="empty-title">No hay entities</div>
            <div class="empty-sub">Crea la primera desde el panel admin.</div>
          </div>
        }
      } @else {
        <div class="loading">Cargando…</div>
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
    }

    .btn.primary {
      background: #111;
      color: #fff;
      border-color: #111;
    }

    .pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.8);
      color: rgba(0,0,0,.72);
    }

    .meta { margin-bottom: 14px; }

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
    }

    .slug {
      color: #666;
      font-family: monospace;
      font-size: 12px;
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
    }

    .mini.danger {
      color: #b00020;
      border-color: rgba(176,0,32,.18);
    }

    .empty {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      background: #fff;
      padding: 18px;
    }

    .empty-title { font-weight: 800; }
    .empty-sub { margin-top: 6px; color: #666; }

    .loading { color: #666; padding: 40px 0; }

    @media (max-width: 900px) {
      .table-wrap {
        overflow-x: auto;
      }

      .table {
        min-width: 900px;
      }
    }
  `],
})
export class AdminEntitiesComponent {
  private api = inject(AdminEntitiesApi);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  vm$ = this.refresh$.pipe(
    switchMap(() =>
      this.api.list({ page: 1, limit: 24, sort: 'recent' }).pipe(
        catchError(() => of({ items: [], total: 0 }))
      )
    )
  );

  remove(id: string, title: string) {
    const ok = window.confirm(`¿Borrar "${title}"?`);
    if (!ok) return;

    this.api.remove(id).subscribe({
      next: () => this.refresh$.next(),
      error: () => alert('No se pudo borrar la entity'),
    });
  }
}