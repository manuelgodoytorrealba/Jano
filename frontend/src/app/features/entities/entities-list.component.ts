import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';
import { switchMap } from 'rxjs';

type Entity = any;

@Component({
  standalone: true,
  selector: 'app-entities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    <div class="page">
      <header class="top">
        <button class="back" type="button" (click)="back()">←</button>
        <div>
          <h1 class="h1">{{ title() }}</h1>
          <p class="muted">Explora {{ title().toLowerCase() }} en JANO</p>
        </div>
      </header>

      <section class="controls">
        <input
          class="search"
          type="search"
          placeholder="Buscar…"
          [value]="q()"
          (input)="setQ(($any($event.target)).value)"
        />

        <div class="meta">
          @if (vm$ | async; as vm) {
            <span class="pill">{{ vm.total }} resultados</span>
            <span class="pill">Página {{ vm.page }} / {{ vm.totalPages }}</span>
          }
        </div>
      </section>

      @if (vm$ | async; as vm) {
        <section class="grid">
          @for (e of vm.items; track e.slug) {
            <article class="card" (click)="go(e.slug)">
              <div class="thumb">
                @if (thumb(e)) {
                  <img [src]="thumb(e)!" [alt]="e.title" loading="lazy" />
                } @else {
                  <div class="ph"></div>
                }
              </div>

              <div class="body">
                <div class="badges">
                  <span class="badge">{{ e.type }}</span>
                  @if (e.status) { <span class="badge">{{ e.status }}</span> }
                  @if (e.contentLevel) { <span class="badge">{{ e.contentLevel }}</span> }
                </div>

                <div class="title">{{ e.title }}</div>

                @if (e.summary) {
                  <div class="summary">{{ e.summary }}</div>
                }
              </div>
            </article>
          }
        </section>

        <section class="pager">
          <button class="btn" type="button" (click)="prevPage()" [disabled]="page() <= 1">
            Anterior
          </button>
          <button class="btn" type="button" (click)="nextPage(vm.totalPages)" [disabled]="page() >= vm.totalPages">
            Siguiente
          </button>
        </section>
      } @else {
        <div class="loading">Cargando…</div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px; }

    .top {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 14px;
      align-items: start;
      margin-bottom: 16px;
    }
    .back {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.08);
      background: #fff;
      cursor: pointer;
    }

    .h1 { margin: 0; font-size: 28px; letter-spacing: -0.03em; }
    .muted { margin: 6px 0 0; color: #666; }

    .controls {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }

    .search {
      height: 44px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,.10);
      padding: 0 14px;
      outline: none;
      background: #fff;
    }

    .meta { display: flex; gap: 10px; flex-wrap: wrap; }
    .pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.8);
      color: rgba(0,0,0,.72);
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }

    .card {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      overflow: hidden;
      background: #fff;
      cursor: pointer;
      display: grid;
      grid-template-columns: 100px 1fr;
      min-height: 108px;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .card:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,.06); }

    .thumb { background: #f3f3f3; display: grid; place-items: center; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .ph { width: 100%; height: 100%; background: linear-gradient(135deg, #f2f2f2, #fafafa); }

    .body { padding: 12px; display: grid; gap: 8px; align-content: start; }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge {
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.75);
      color: rgba(0,0,0,.72);
      letter-spacing: .06em;
      text-transform: uppercase;
    }

    .title { font-weight: 780; letter-spacing: -0.02em; }
    .summary { font-size: 13px; line-height: 1.45; color: rgba(0,0,0,.72); }

    .pager {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .btn {
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
    }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .loading { color: #666; padding: 40px 0; }

    @media (max-width: 640px) {
      .card { grid-template-columns: 1fr; }
      .thumb { height: 160px; }
    }
  `],
})
export class EntitiesListComponent {
  private api = inject(EntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // estado UI
  q = signal('');
  page = signal(1);
  limit = 24;

  // type desde URL
  type$ = this.route.paramMap.pipe(
    switchMap((pm) => {
      const t = (pm.get('type') ?? '').toUpperCase();
      // resetea al cambiar de tipo
      this.page.set(1);
      this.q.set('');
      return [t] as any;
    }),
  );

  // nombre bonito para UI
  title = computed(() => {
    const t = (this.route.snapshot.paramMap.get('type') ?? '').toLowerCase();
    if (!t) return 'Entities';
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  vm$ = this.route.paramMap.pipe(
    switchMap((pm) => {
      const type = (pm.get('type') ?? '').toUpperCase();
      return this.api.list({
        type,
        q: this.q(),
        page: this.page(),
        limit: this.limit,
        sort: 'recent',
      });
    }),
  );

  // helpers
  thumb(e: Entity): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  setQ(value: string) {
    this.q.set(value);
    this.page.set(1);
    // fuerza refresh: navegamos al mismo route (Angular reusa) => alternativa simple: cambiar queryParam
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  prevPage() {
    this.page.set(Math.max(1, this.page() - 1));
    this.refreshQuery();
  }

  nextPage(totalPages: number) {
    this.page.set(Math.min(totalPages, this.page() + 1));
    this.refreshQuery();
  }

  refreshQuery() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.page() },
      queryParamsHandling: 'merge',
    });
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }

  back() {
    this.router.navigate(['/']);
  }
}