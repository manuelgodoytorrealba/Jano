import { AsyncPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
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
type ViewMode = 'explore' | 'list';

@Component({
  standalone: true,
  selector: 'app-entities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  templateUrl: './entities-list.component.html',
  styleUrls: ['./entities-list.component.scss'],
})
export class EntitiesListComponent implements AfterViewInit, OnDestroy {
  private api = inject(EntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly limit = 24;

  // ✅ modo de vista (Explorer por defecto)
  viewMode: ViewMode = 'list';

  // Skeleton items
  skeleton = Array.from({ length: 8 });

  // ---------- Explorer refs/state ----------
  @ViewChild('explorer', { static: false })
  explorerRef?: ElementRef<HTMLElement>;

  activeIndex = signal(0);
  private io?: IntersectionObserver;

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
    map(([q, status, contentLevel]) => {
      const qq = (q ?? '').trim();
      const ss = (status ?? '').trim();
      const cc = (contentLevel ?? '').trim();
      return !!(qq || ss || cc);
    }),
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

  // -------- lifecycle --------
  ngAfterViewInit() {
    // el template se monta después; dejamos que Angular pinte primero
    queueMicrotask(() => this.setupExplorerObserver());
  }

  ngOnDestroy() {
    this.io?.disconnect();
  }

  // -------- explorer logic --------
  setView(mode: ViewMode) {
    this.viewMode = mode;

    // si vuelves a explorer, asegúrate de re-observar cards
    if (mode === 'explore') {
      queueMicrotask(() => this.setupExplorerObserver());
    } else {
      this.io?.disconnect();
    }
  }

  private setupExplorerObserver() {
    const root = this.explorerRef?.nativeElement;
    if (!root) return;

    this.io?.disconnect();

    this.io = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;

        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;

        const el = best.target as HTMLElement;
        const raw = el.dataset['i'];
        const idx = raw ? Number(raw) : 0;
        if (Number.isFinite(idx)) this.activeIndex.set(idx);
      },
      {
        root,
        rootMargin: '0px -40% 0px -40%',
        threshold: [0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 0.95],
      },
    );

    const cards = root.querySelectorAll<HTMLElement>('.explore-card');
    cards.forEach((c) => this.io!.observe(c));
  }

  scrollExplorer(dir: -1 | 1) {
    const el = this.explorerRef?.nativeElement;
    if (!el) return;

    const card = el.querySelector<HTMLElement>('.explore-card');
    const step = (card?.offsetWidth ?? 520) + 42;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

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

    // Si no hay búsqueda, relevance no aplica
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

  onExploreClick(items: Entity[], index: number) {
  if (index !== this.activeIndex()) {
    this.activeIndex.set(index);
    // opcional: scrollear para centrar la card
    this.scrollToIndex(index);
    return;
  }
  const e = items[index];
  if (e?.slug) this.go(e.slug);
}

private scrollToIndex(index: number) {
  const el = this.explorerRef?.nativeElement;
  if (!el) return;
  const card = el.querySelector<HTMLElement>(`.explore-card[data-i="${index}"]`);
  card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}
}