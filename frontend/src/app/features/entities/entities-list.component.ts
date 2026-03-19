import { AsyncPipe, } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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

import { EntitiesExplorer3dComponent } from '../entities-explorer-3d/entities-explorer-3d.component';

type Entity = any;

type Sort = 'recent' | 'title' | 'relevance';
type Status = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | '';
type Level = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | '';
type ViewMode = 'explore' | 'list';

@Component({
  standalone: true,
  selector: 'app-entities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, EntitiesExplorer3dComponent],
  templateUrl: './entities-list.component.html',
  styleUrls: ['./entities-list.component.scss'],
})
export class EntitiesListComponent {
  private api = inject(EntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly limit = 24;

  viewMode: ViewMode = 'explore';
  skeleton = Array.from({ length: 8 });
  activeIndex = signal(0);

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

  setView(mode: ViewMode) {
    this.viewMode = mode;
  }

  moveActive(dir: -1 | 1, total: number) {
    if (!total) return;
    const next = Math.max(0, Math.min(total - 1, this.activeIndex() + dir));
    this.activeIndex.set(next);
  }

  planeStyle(index: number, total: number) {
    const active = this.activeIndex();
    const delta = index - active;
    const abs = Math.abs(delta);

    if (abs > 4) {
      return {
        opacity: '0',
        pointerEvents: 'none',
        transform: 'translate3d(-50%, -50%, -600px) rotateZ(-8deg) scale(0.82)',
        zIndex: '0',
      };
    }

    const slots = [
      { x: 8, y: 84, r: -10, s: 0.82, o: 0.30 },
      { x: 24, y: 66, r: -7, s: 0.88, o: 0.46 },
      { x: 42, y: 48, r: -4, s: 0.96, o: 0.72 },
      { x: 60, y: 30, r: -1, s: 1.06, o: 1.00 },
      { x: 77, y: 13, r: 3, s: 0.94, o: 0.64 },
      { x: 91, y: -1, r: 5, s: 0.86, o: 0.34 },
    ];

    const slotIndex = Math.max(0, Math.min(slots.length - 1, delta + 3));
    const slot = slots[slotIndex];

    const depth = delta === 0 ? 0 : -abs * 110;
    const blur = delta === 0 ? 0 : Math.min(abs * 1.4, 4);
    const opacity = delta === 0 ? 1 : slot.o;

    return {
      left: `${slot.x}%`,
      top: `${slot.y}%`,
      zIndex: `${100 - abs}`,
      opacity: `${opacity}`,
      filter: `blur(${blur}px)`,
      transform: `
      translate3d(-50%, -50%, ${depth}px)
      rotateZ(${slot.r}deg)
      scale(${slot.s})
    `,
    };
  }

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

  onExploreClick(items: Entity[], index: number) {
    if (index !== this.activeIndex()) {
      this.activeIndex.set(index);
      return;
    }

    const e = items[index];
    if (e?.slug) this.go(e.slug);
  }
  isMuted(index: number): boolean {
    return Math.abs(index - this.activeIndex()) > 3;
  }
}