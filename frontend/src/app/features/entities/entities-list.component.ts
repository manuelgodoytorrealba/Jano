import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs';

type Entity = any;
type Sort = 'recent' | 'title' | 'relevance';
type Status = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | '';
type Level = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | '';

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
          <h1 class="h1">{{ title$ | async }}</h1>
          <p class="muted">Explora {{ (title$ | async)?.toLowerCase() }} en JANO</p>
        </div>
      </header>

      <section class="controls">
        <input
          class="search"
          type="search"
          placeholder="Buscar…"
          [value]="qFromUrl$ | async"
          (input)="setQ(($any($event.target)).value)"
        />

        <!-- Search chip -->
        @if (qFromUrl$ | async; as q) {
          @if (q) {
            <div class="search-chip">
              <span class="search-label">Buscando:</span>
              <span class="search-value">“{{ q }}”</span>
              <button
                type="button"
                class="search-x"
                (click)="clearSearch()"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            </div>
          }
        }

        <!-- SORT -->
        <div class="sort">
          <div class="label">Orden</div>
          <div class="chips">
            <button
              type="button"
              class="chip"
              [class.on]="(sortFromUrl$ | async) === 'recent'"
              (click)="toggleSort('recent')"
            >
              Recientes
            </button>

            <button
              type="button"
              class="chip"
              [class.on]="(sortFromUrl$ | async) === 'title'"
              (click)="toggleSort('title')"
            >
              Título A–Z
            </button>

            <button
              type="button"
              class="chip"
              [class.on]="(sortFromUrl$ | async) === 'relevance'"
              [disabled]="!(qFromUrl$ | async)"
              (click)="toggleSort('relevance')"
              title="Activa una búsqueda para ordenar por relevancia"
            >
              Relevancia
            </button>
          </div>
        </div>

        <!-- FILTERS -->
        <div class="filters">
          <div class="filter-group">
            <div class="label">Status</div>
            <div class="chips">
              <button
                type="button"
                class="chip"
                [class.on]="(statusFromUrl$ | async) === 'DRAFT'"
                (click)="toggleStatus('DRAFT')"
              >
                Draft
              </button>

              <button
                type="button"
                class="chip"
                [class.on]="(statusFromUrl$ | async) === 'IN_REVIEW'"
                (click)="toggleStatus('IN_REVIEW')"
              >
                In review
              </button>

              <button
                type="button"
                class="chip"
                [class.on]="(statusFromUrl$ | async) === 'PUBLISHED'"
                (click)="toggleStatus('PUBLISHED')"
              >
                Published
              </button>

              <button
                type="button"
                class="chip ghost"
                [class.on]="!(statusFromUrl$ | async)"
                (click)="toggleStatus('')"
              >
                Todos
              </button>
            </div>
          </div>

          <div class="filter-group">
            <div class="label">Nivel</div>
            <div class="chips">
              <button
                type="button"
                class="chip"
                [class.on]="(contentLevelFromUrl$ | async) === 'BASIC'"
                (click)="toggleContentLevel('BASIC')"
              >
                Basic
              </button>

              <button
                type="button"
                class="chip"
                [class.on]="(contentLevelFromUrl$ | async) === 'INTERMEDIATE'"
                (click)="toggleContentLevel('INTERMEDIATE')"
              >
                Intermediate
              </button>

              <button
                type="button"
                class="chip"
                [class.on]="(contentLevelFromUrl$ | async) === 'ADVANCED'"
                (click)="toggleContentLevel('ADVANCED')"
              >
                Advanced
              </button>

              <button
                type="button"
                class="chip ghost"
                [class.on]="!(contentLevelFromUrl$ | async)"
                (click)="toggleContentLevel('')"
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        @if (hasActiveFilters$ | async) {
          <button type="button" class="reset" (click)="resetFilters()">
            Reset filtros
          </button>
        }

        <div class="meta">
          @if (vm$ | async; as vm) {
            <span class="pill">{{ vm.total }} resultados</span>
            <span class="pill">Página {{ vm.page }} / {{ vm.totalPages }}</span>
          }
        </div>
      </section>

      @if (vm$ | async; as vm) {
        @if (vm.items.length) {
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

                  <div
                    class="title"
                    [innerHTML]="highlight(e.title ?? '', (qFromUrl$ | async) ?? '')"
                  ></div>

                  @if (e.summary) {
                    <div
                      class="summary"
                      [innerHTML]="highlight(cleanWiki(e.summary ?? ''), (qFromUrl$ | async) ?? '')"
                    ></div>
                  }
                </div>
              </article>
            }
          </section>

          <section class="pager">
            <button class="btn" type="button" (click)="prevPage()" [disabled]="vm.page <= 1">
              Anterior
            </button>
            <button class="btn" type="button" (click)="nextPage(vm.totalPages)" [disabled]="vm.page >= vm.totalPages">
              Siguiente
            </button>
          </section>
        } @else {
          <div class="empty">
            <div class="empty-title">Sin resultados</div>
            <div class="empty-sub">Prueba con otra búsqueda o ajusta los filtros.</div>
          </div>
        }
      } @else {
        <!-- Skeleton loader -->
        <section class="grid">
          @for (_ of skeleton; track $index) {
            <article class="card sk">
              <div class="thumb"><div class="sk-img"></div></div>
              <div class="body">
                <div class="sk-line w1"></div>
                <div class="sk-line w2"></div>
                <div class="sk-line w3"></div>
              </div>
            </article>
          }
        </section>
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

    .controls { display: grid; gap: 10px; margin-bottom: 16px; }

    .search {
      height: 44px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,.10);
      padding: 0 14px;
      outline: none;
      background: #fff;
    }

    .search-chip{
      display:flex;
      align-items:center;
      gap:10px;
      width: fit-content;
      padding: 8px 10px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.85);
    }
    .search-label{
      font-size: 12px;
      color: rgba(0,0,0,.55);
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .search-value{
      font-size: 13px;
      font-weight: 700;
    }
    .search-x{
      width: 28px;
      height: 28px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
    }

    .sort { display: grid; gap: 8px; }

    .filters { display: grid; gap: 12px; }
    .filter-group { display: grid; gap: 8px; }

    .label {
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #666;
    }

    .chips { display: flex; gap: 10px; flex-wrap: wrap; }

    .chip {
      height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
      font-size: 13px;
      transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
    }

    .chip:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(0,0,0,.06); }

    .chip.on {
      border-color: rgba(0,0,0,.18);
      background: rgba(0,0,0,.06);
    }

    .chip.ghost {
      border-style: dashed;
      background: rgba(255,255,255,.6);
    }

    .chip:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

    .reset {
      height: 36px;
      width: fit-content;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px dashed rgba(0,0,0,.18);
      background: rgba(255,255,255,.7);
      cursor: pointer;
      font-size: 13px;
      color: rgba(0,0,0,.78);
    }
    .reset:hover {
      box-shadow: 0 10px 18px rgba(0,0,0,.06);
      transform: translateY(-1px);
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

    mark {
      background: rgba(0,0,0,.10);
      color: inherit;
      padding: 0 3px;
      border-radius: 6px;
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

    .empty {
      margin-top: 22px;
      border: 1px solid rgba(0,0,0,.08);
      background: #fff;
      border-radius: 18px;
      padding: 18px;
    }
    .empty-title { font-weight: 800; letter-spacing: -0.02em; }
    .empty-sub { margin-top: 6px; color: #666; font-size: 13px; }

    /* Skeleton */
    .sk { pointer-events:none; }
    .sk-img{
      width:100%;
      height:100%;
      background: rgba(0,0,0,.06);
    }
    .sk-line{
      height: 12px;
      border-radius: 8px;
      background: rgba(0,0,0,.06);
    }
    .w1{ width: 70%; }
    .w2{ width: 90%; }
    .w3{ width: 55%; }

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

  private readonly limit = 24;

  // Skeleton items
  skeleton = Array.from({ length: 8 });

  // -------- URL -> state --------
  title$ = this.route.paramMap.pipe(
    map((pm) => (pm.get('type') ?? 'entities').toLowerCase()),
    map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
    distinctUntilChanged(),
  );

  typeFromUrl$ = this.route.paramMap.pipe(
    map((pm) => (pm.get('type') ?? '').toUpperCase()),
    distinctUntilChanged(),
  );

  qFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  pageFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => {
      const raw = Number(qpm.get('page') ?? 1);
      return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }),
    distinctUntilChanged(),
  );

  statusFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('status') ?? '').trim()),
    distinctUntilChanged(),
  );

  contentLevelFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('contentLevel') ?? '').trim()),
    distinctUntilChanged(),
  );

  sortFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('sort') ?? 'recent').trim()),
    map((s) => (s === 'title' || s === 'relevance' ? s : 'recent') as Sort),
    distinctUntilChanged(),
  );

  hasActiveFilters$ = combineLatest([
    this.qFromUrl$,
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
  ]).pipe(
    map(([q, status, contentLevel]) =>
      !!((q ?? '').trim() || (status ?? '').trim() || (contentLevel ?? '').trim()),
    ),
    distinctUntilChanged(),
  );

  // -------- VM --------
  vm$ = combineLatest([
    this.typeFromUrl$,
    this.qFromUrl$.pipe(debounceTime(300)),
    this.pageFromUrl$,
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
    this.sortFromUrl$,
  ]).pipe(
    switchMap(([type, q, page, status, contentLevel, sort]) => {
      const qq = (q ?? '').trim();
      const ss = (status ?? '').trim();
      const cc = (contentLevel ?? '').trim();

      // relevance sin búsqueda no tiene sentido
      const safeSort: Sort = sort === 'relevance' && !qq ? 'recent' : sort;

      return this.api.list({
        type,
        q: qq.length ? qq : undefined,
        page,
        limit: this.limit,
        sort: safeSort,
        status: ss.length ? ss : undefined,
        contentLevel: cc.length ? cc : undefined,
      });
    }),
  );

  // -------- helpers --------
  thumb(e: Entity): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  cleanWiki(text: string): string {
    if (!text) return '';
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  escapeHtml(text: string): string {
    return (text ?? '')
      .toString()
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  highlight(text: string, query: string): string {
    const t = (text ?? '').toString();
    const q = (query ?? '').trim();
    if (!q) return this.escapeHtml(t);

    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapedQ, 'ig');

    const parts = t.split(re);
    const matches = t.match(re);
    if (!matches) return this.escapeHtml(t);

    let out = '';
    for (let i = 0; i < parts.length; i++) {
      out += this.escapeHtml(parts[i]);
      if (i < matches.length) out += `<mark>${this.escapeHtml(matches[i])}</mark>`;
    }
    return out;
  }

  // -------- UI handlers --------
  clearSearch() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, page: 1, sort: null },
      queryParamsHandling: 'merge',
    });
  }

  setQ(value: string) {
    const v = (value ?? '').trim();
    const currentSort = (this.route.snapshot.queryParamMap.get('sort') ?? '').trim();
    const keepTitle = currentSort === 'title';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: v || null,
        page: 1,
        sort: v ? (keepTitle ? 'title' : 'relevance') : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  toggleSort(next: Sort) {
    const current = (this.route.snapshot.queryParamMap.get('sort') ?? 'recent').trim();
    const q = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();

    if (next === 'relevance' && !q) next = 'recent';

    const value = next === current ? 'recent' : next;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: value === 'recent' ? null : value, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  prevPage() {
    const current = Number(this.route.snapshot.queryParamMap.get('page') ?? 1);
    const next = Math.max(1, current - 1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: next },
      queryParamsHandling: 'merge',
    });
  }

  nextPage(totalPages: number) {
    const current = Number(this.route.snapshot.queryParamMap.get('page') ?? 1);
    const next = Math.min(totalPages, current + 1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: next },
      queryParamsHandling: 'merge',
    });
  }

  toggleStatus(next: Status) {
    const current = (this.route.snapshot.queryParamMap.get('status') ?? '').trim();
    const value = next && next === current ? '' : next;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  toggleContentLevel(next: Level) {
    const current = (this.route.snapshot.queryParamMap.get('contentLevel') ?? '').trim();
    const value = next && next === current ? '' : next;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { contentLevel: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  resetFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: null,
        status: null,
        contentLevel: null,
        sort: null,
        page: 1,
      },
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