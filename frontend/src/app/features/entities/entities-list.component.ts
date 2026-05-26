import { AsyncPipe, } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';
import { Tag, TagsApi } from '../../core/api/tags.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';

import { EntitiesExplorer3dComponent } from '../entities-explorer-3d/entities-explorer-3d.component';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type Entity = any;
type FilterOption = { slug: string; title: string };
type EntityListVm = { items: Entity[]; page: number; limit: number; total: number; totalPages: number };
type FilterSupport = { movement: boolean; period: boolean; institution: boolean; nationality: boolean };

type Sort = 'recent' | 'title' | 'relevance';
type Status = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | '';
type Level = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | '';
type ViewMode = 'explore' | 'list';
type FilterMenuKey = 'movement' | 'period' | 'institution' | 'nationality' | 'tag';
type TagFilterOption = Pick<Tag, 'slug' | 'label' | 'category'>;

const STATUS_LABELS: Record<Exclude<Status, ''>, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  PUBLISHED: 'Published',
};

const CONTENT_LEVEL_LABELS: Record<Exclude<Level, ''>, string> = {
  BASIC: 'Basic',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const FILTER_SUPPORT_BY_TYPE: Record<string, FilterSupport> = {
  ARTIST: { movement: true, period: true, institution: false, nationality: true },
  ARTICLE: { movement: false, period: false, institution: false, nationality: false },
  ARTWORK: { movement: true, period: true, institution: true, nationality: false },
  MOVEMENT: { movement: false, period: false, institution: false, nationality: false },
  PERIOD: { movement: false, period: false, institution: false, nationality: false },
  CONCEPT: { movement: false, period: false, institution: false, nationality: false },
};

const TYPE_ROUTE_LABELS: Record<string, string> = {
  artwork: 'Artworks',
  article: 'Articles',
  artist: 'Artists',
  movement: 'Movements',
  period: 'Periods',
  concept: 'Concepts',
  place: 'Places',
  text: 'Texts',
};

@Component({
  standalone: true,
  selector: 'app-entities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, EntitiesExplorer3dComponent, JanoMediaComponent],
  templateUrl: './entities-list.component.html',
  styleUrls: ['./entities-list.component.scss'],
})
export class EntitiesListComponent {
  private api = inject(EntitiesApi);
  private tagsApi = inject(TagsApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);

  private readonly limit = 24;
  private readonly contextualFilterKeys = ['movement', 'period', 'institution', 'nationality'] as const;

  private filterSupportForType(type: string | null | undefined): FilterSupport {
    return FILTER_SUPPORT_BY_TYPE[(type ?? '').trim().toUpperCase()] ?? {
      movement: false,
      period: false,
      institution: false,
      nationality: false,
    };
  }

  private obsoleteQueryParamsForType(type: string, queryParamMap: { get(key: string): string | null }) {
    const support = this.filterSupportForType(type);
    const obsolete: Record<string, null> = {};

    for (const key of this.contextualFilterKeys) {
      const value = (queryParamMap.get(key) ?? '').trim();
      if (!value) continue;

      const isSupported =
        key === 'movement' ? support.movement :
          key === 'period' ? support.period :
            key === 'institution' ? support.institution :
              support.nationality;

      if (!isSupported) {
        obsolete[key] = null;
      }
    }

    return Object.keys(obsolete).length ? obsolete : null;
  }

  viewMode: ViewMode = 'explore';
  skeleton = Array.from({ length: 8 });
  filterSkeleton = Array.from({ length: 4 });
  activeIndex = signal(0);
  advancedFiltersOpen = signal(false);
  filtersPanelOpen = signal(false);
  infoPanelOpen = signal(false);
  openFilterMenu = signal<FilterMenuKey | null>(null);
  curatedDeckMode = signal(false);

  constructor() {
    this.route.queryParamMap.pipe(
      map((queryParamMap) => (queryParamMap.get('deck') ?? '').trim()),
      distinctUntilChanged(),
      tap((deck) => {
        const isCuratedDeck = !!deck;
        this.curatedDeckMode.set(isCuratedDeck);

        if (isCuratedDeck) {
          this.filtersPanelOpen.set(false);
          this.closeFilterMenu();
        }
      }),
      takeUntilDestroyed(),
    ).subscribe();

    combineLatest([this.typeFromUrl$, this.route.queryParamMap]).pipe(
      map(([type, queryParamMap]) => this.obsoleteQueryParamsForType(type, queryParamMap)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap((obsolete) => {
        if (!obsolete) return;

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: obsolete,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }),
      takeUntilDestroyed(),
    ).subscribe();

    combineLatest([this.title$, this.typeFromUrl$, this.qFromUrl$]).pipe(
      tap(([title, type, query]) => {
        const normalizedTitle = title || 'Entities';
        const normalizedQuery = query.trim();
        const pageTitle = normalizedQuery
          ? `Search ${normalizedTitle} for "${normalizedQuery}" | JANO`
          : `${normalizedTitle} | JANO`;
        const description = normalizedQuery
          ? `Browse JANO results for "${normalizedQuery}" inside ${normalizedTitle.toLowerCase()}.`
          : `Explore ${normalizedTitle.toLowerCase()} in JANO with visual browsing and editorial filters.`;
        const typeSlug = (type ?? '').trim().toLowerCase() || 'entities';
        const path = normalizedQuery
          ? `/entities/${typeSlug}?q=${encodeURIComponent(normalizedQuery)}`
          : `/entities/${typeSlug}`;

        this.seo.setPageMeta({
          title: pageTitle,
          description,
          path,
        });
      }),
      takeUntilDestroyed(),
    ).subscribe();
  }

  title$ = this.route.paramMap.pipe(
    map((pm) => (pm.get('type') ?? 'entities').toLowerCase()),
    map((t) => TYPE_ROUTE_LABELS[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))),
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

  deckFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('deck') ?? '').trim()),
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

  movementFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('movement') ?? '').trim()),
    distinctUntilChanged(),
  );

  periodFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('period') ?? '').trim()),
    distinctUntilChanged(),
  );

  institutionFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('institution') ?? '').trim()),
    distinctUntilChanged(),
  );

  nationalityFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('nationality') ?? '').trim()),
    distinctUntilChanged(),
  );

  tagFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('tag') ?? '').trim()),
    distinctUntilChanged(),
  );

  sortFromUrl$ = this.route.queryParamMap.pipe(
    map((qpm) => (qpm.get('sort') ?? 'recent').trim()),
    map((s) => (s === 'title' || s === 'relevance' ? s : 'recent') as Sort),
    distinctUntilChanged(),
  );

  movementOptions$ = this.api.list({
    type: 'MOVEMENT',
    limit: 60,
    page: 1,
    sort: 'title',
    status: 'PUBLISHED',
  }).pipe(
    map((result) =>
      (result.items ?? []).map((item) => ({
        slug: item.slug,
        title: item.title,
      }) as FilterOption),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  periodOptions$ = this.api.list({
    type: 'PERIOD',
    limit: 60,
    page: 1,
    sort: 'title',
    status: 'PUBLISHED',
  }).pipe(
    map((result) =>
      (result.items ?? []).map((item) => ({
        slug: item.slug,
        title: item.title,
      }) as FilterOption),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  institutionOptions$ = this.api.institutions().pipe(
    map((items) =>
      (items ?? []).map((item) => ({
        slug: item,
        title: item,
      }) as FilterOption),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  nationalityOptions$ = this.api.nationalities().pipe(
    map((items) =>
      (items ?? []).map((item) => ({
        slug: item,
        title: item,
      }) as FilterOption),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  tagOptions$ = this.tagsApi.list().pipe(
    map((items) =>
      (items ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => ({
          slug: item.slug,
          label: item.label,
          category: item.category,
        }) as TagFilterOption),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  filterSupport$ = this.typeFromUrl$.pipe(
    map((type) => this.filterSupportForType(type)),
    distinctUntilChanged((a, b) =>
      a.movement === b.movement &&
      a.period === b.period &&
      a.institution === b.institution &&
      a.nationality === b.nationality,
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  supportsMovement$ = this.filterSupport$.pipe(
    map((support) => support.movement),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  supportsPeriod$ = this.filterSupport$.pipe(
    map((support) => support.period),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  supportsInstitution$ = this.filterSupport$.pipe(
    map((support) => support.institution),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  supportsNationality$ = this.filterSupport$.pipe(
    map((support) => support.nationality),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  movementLabel$ = combineLatest([this.movementFromUrl$, this.movementOptions$]).pipe(
    map(([slug, options]) => options.find((item) => item.slug === slug)?.title ?? slug),
    distinctUntilChanged(),
  );

  periodLabel$ = combineLatest([this.periodFromUrl$, this.periodOptions$]).pipe(
    map(([slug, options]) => options.find((item) => item.slug === slug)?.title ?? slug),
    distinctUntilChanged(),
  );

  institutionLabel$ = combineLatest([this.institutionFromUrl$, this.institutionOptions$]).pipe(
    map(([value, options]) => options.find((item) => item.slug === value)?.title ?? value),
    distinctUntilChanged(),
  );

  nationalityLabel$ = combineLatest([this.nationalityFromUrl$, this.nationalityOptions$]).pipe(
    map(([value, options]) => options.find((item) => item.slug === value)?.title ?? value),
    distinctUntilChanged(),
  );

  tagLabel$ = combineLatest([this.tagFromUrl$, this.tagOptions$]).pipe(
    map(([slug, options]) => options.find((item) => item.slug === slug)?.label ?? slug),
    distinctUntilChanged(),
  );

  hasActiveFilters$ = combineLatest([
    this.qFromUrl$,
    this.deckFromUrl$,
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
    this.movementFromUrl$,
    this.periodFromUrl$,
    this.institutionFromUrl$,
    this.nationalityFromUrl$,
    this.tagFromUrl$,
    this.filterSupport$,
  ]).pipe(
    map(([q, deck, status, contentLevel, movement, period, institution, nationality, tag, support]) => {
      const qq = (q ?? '').trim();
      const dd = (deck ?? '').trim();
      const ss = (status ?? '').trim();
      const cc = (contentLevel ?? '').trim();
      const mm = support.movement ? (movement ?? '').trim() : '';
      const pp = support.period ? (period ?? '').trim() : '';
      const ii = support.institution ? (institution ?? '').trim() : '';
      const nn = support.nationality ? (nationality ?? '').trim() : '';
      const tt = (tag ?? '').trim();
      return !!(qq || dd || ss || cc || mm || pp || ii || nn || tt);
    }),
    distinctUntilChanged(),
  );

  hasVisibleFilterChips$ = combineLatest([
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
    this.movementFromUrl$,
    this.periodFromUrl$,
    this.institutionFromUrl$,
    this.nationalityFromUrl$,
    this.tagFromUrl$,
    this.filterSupport$,
  ]).pipe(
    map(([status, contentLevel, movement, period, institution, nationality, tag, support]) => {
      const ss = (status ?? '').trim();
      const cc = (contentLevel ?? '').trim();
      const mm = support.movement ? (movement ?? '').trim() : '';
      const pp = support.period ? (period ?? '').trim() : '';
      const ii = support.institution ? (institution ?? '').trim() : '';
      const nn = support.nationality ? (nationality ?? '').trim() : '';
      const tt = (tag ?? '').trim();
      return !!(ss || cc || mm || pp || ii || nn || tt);
    }),
    distinctUntilChanged(),
  );

  hasAdvancedFilters$ = combineLatest([
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
  ]).pipe(
    map(([status, contentLevel]) => !!((status ?? '').trim() || (contentLevel ?? '').trim())),
    distinctUntilChanged(),
  );

  vm$: Observable<EntityListVm> = combineLatest([
    this.typeFromUrl$,
    this.qFromUrl$.pipe(debounceTime(300)),
    this.deckFromUrl$,
    this.pageFromUrl$,
    this.statusFromUrl$,
    this.contentLevelFromUrl$,
    this.movementFromUrl$,
    this.periodFromUrl$,
    this.institutionFromUrl$,
    this.nationalityFromUrl$,
    this.tagFromUrl$,
    this.sortFromUrl$,
    this.filterSupport$,
  ]).pipe(
    switchMap(([type, q, deck, page, status, contentLevel, movement, period, institution, nationality, tag, sort, support]) => {
      const qq = (q ?? '').trim();
      const dd = (deck ?? '').trim();
      const ss = (status ?? '').trim();
      const cc = (contentLevel ?? '').trim();
      const mm = support.movement ? (movement ?? '').trim() : '';
      const pp = support.period ? (period ?? '').trim() : '';
      const ii = support.institution ? (institution ?? '').trim() : '';
      const nn = support.nationality ? (nationality ?? '').trim() : '';
      const tt = (tag ?? '').trim();

      const safeSort: Sort = sort === 'relevance' && !qq ? 'recent' : sort;

      return this.api.list({
        type,
        q: qq.length ? qq : undefined,
        deck: dd.length ? dd : undefined,
        page,
        limit: this.limit,
        sort: safeSort,
        status: ss.length ? ss : undefined,
        contentLevel: cc.length ? cc : undefined,
        movement: mm.length ? mm : undefined,
        period: pp.length ? pp : undefined,
        institution: ii.length ? ii : undefined,
        nationality: nn.length ? nn : undefined,
        tag: tt.length ? tt : undefined,
      });
    }),
    tap((result: EntityListVm) => {
      const total = result.items?.length ?? 0;
      const nextIndex = total > 0 ? Math.floor((total - 1) / 2) : 0;

      if (this.activeIndex() !== nextIndex) {
        this.activeIndex.set(nextIndex);
      }
    }),
  );

  setView(mode: ViewMode) {
    this.closeFilterMenu();
    this.viewMode = mode;
  }

  toggleFiltersPanel() {
    this.filtersPanelOpen.update((value) => {
      const next = !value;

      if (!next) {
        this.closeFilterMenu();
      }

      return next;
    });
  }

  openFiltersPanel() {
    this.filtersPanelOpen.set(true);
  }

  closeInfoPanel() {
    this.infoPanelOpen.set(false);
  }

  openInfoPanel() {
    this.infoPanelOpen.set(true);
  }

  toggleFilterMenu(key: FilterMenuKey) {
    this.openFilterMenu.update((current) => current === key ? null : key);
  }

  closeFilterMenu() {
    this.openFilterMenu.set(null);
  }

  selectFilterOption(key: FilterMenuKey, value: string) {
    switch (key) {
      case 'movement':
        this.setMovement(value);
        break;
      case 'period':
        this.setPeriod(value);
        break;
      case 'institution':
        this.setInstitution(value);
        break;
      case 'nationality':
        this.setNationality(value);
        break;
      case 'tag':
        this.setTag(value);
        break;
    }

    this.closeFilterMenu();
  }

  toggleAdvancedFilters() {
    this.advancedFiltersOpen.update((value) => !value);
  }

  statusLabel(value: string | null | undefined): string {
    const key = (value ?? '').trim() as Exclude<Status, ''>;
    return STATUS_LABELS[key] ?? key;
  }

  contentLevelLabel(value: string | null | undefined): string {
    const key = (value ?? '').trim() as Exclude<Level, ''>;
    return CONTENT_LEVEL_LABELS[key] ?? key;
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

  setMovement(next: string) {
    const value = (next ?? '').trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { movement: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  setPeriod(next: string) {
    const value = (next ?? '').trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { period: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  setInstitution(next: string) {
    const value = (next ?? '').trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { institution: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  setNationality(next: string) {
    const value = (next ?? '').trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { nationality: value || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  setTag(next: string) {
    const value = (next ?? '').trim();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: value || null, page: 1 },
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
        movement: null,
        period: null,
        institution: null,
        nationality: null,
        tag: null,
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

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.entities-filter-menu')) {
      return;
    }

    this.closeFilterMenu();
  }

  @HostListener('document:keydown.escape')
  handleEscape() {
    this.closeFilterMenu();
  }
}
