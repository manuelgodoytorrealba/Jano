import { VisualReferenceService } from '../../shared/discovery/visual-reference.service';
import { DiscoveryImageIconComponent } from '../../shared/discovery/discovery-image-icon.component';
import { DiscoveryLayersComponent } from '../../shared/discovery/discovery-layers.component';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
  startWith,
  Subject,
  Observable,
  combineLatest,
} from 'rxjs';
import { SearchApi, SearchResponse, SearchResult, SearchSection } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppLoadingComponent } from '../../shared/ui/app-loading/app-loading.component';
import { entityTypeLabel } from '../../core/i18n/domain-labels';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type SearchViewModel = SearchResponse & {
  error: boolean;
  imageExpired?: boolean;
  loading: boolean;
};

type SearchFilter = 'ALL' | SearchResult['resultType'];

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [
    DiscoveryImageIconComponent,
    AsyncPipe,
    JanoMediaComponent,
    RouterLink,
    AppLoadingComponent,
    DiscoveryLayersComponent,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (this.hasCriteria(params)) return;
      const mode = params.get('mode');
      void this.router.navigate(['/home'], {
        replaceUrl: true,
        ...(mode === 'image' || mode === 'color' ? { queryParams: { mode } } : {}),
      });
    });
  }

  readonly filtersOpen = signal(false);
  readonly referencePreview = inject(VisualReferenceService).preview;
  criteria(key: string) {
    return this.route.snapshot.queryParamMap.get(key) ?? '';
  }
  colors() {
    return this.criteria('colors').split(',').filter(Boolean);
  }
  openVisual(mode: 'image' | 'color') {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode },
      queryParamsHandling: 'merge',
    });
  }
  removeColor(color: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        colors:
          this.colors()
            .filter((value) => value !== color)
            .join(',') || null,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }
  refine(event: Event, q: string) {
    event.preventDefault();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q.trim() || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  readonly activeFilter = signal<SearchFilter>('ALL');
  private previousCriteria = '';
  readonly filters: SearchFilter[] = ['ALL', 'ENTITY', 'RESEARCH', 'RELATION'];

  readonly q$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly retry$ = new Subject<void>();

  readonly vm$: Observable<SearchViewModel> = combineLatest([
    this.route.queryParamMap.pipe(
      distinctUntilChanged((a, b) =>
        ['q', 'image', 'colors', 'layers', 'type', 'kind', 'tag', 'page'].every(
          (key) => a.get(key) === b.get(key),
        ),
      ),
    ),
    this.retry$.pipe(startWith(undefined)),
    toObservable(this.i18n.locale),
  ]).pipe(
    switchMap(([params, , locale]) => {
      if (!this.hasCriteria(params)) {
        return of({
          query: '',
          total: 0,
          items: [],
          groups: {},
          sections: [],
          error: false,
          loading: false,
        });
      }
      const q = (params.get('q') ?? '').trim();
      const image = params.get('image') ?? undefined;
      const colors = params.get('colors') ?? undefined;
      const layers = params.get('layers') ?? undefined;
      const criteria = JSON.stringify([
        q,
        image,
        colors,
        layers,
        params.get('type'),
        params.get('kind'),
        params.get('tag'),
        locale,
      ]);
      if (criteria !== this.previousCriteria) this.activeFilter.set('ALL');
      this.previousCriteria = criteria;
      this.seo.setPageMeta({
        title: q ? `Search "${q}" | JANO` : 'Search | JANO',
        description: q
          ? `Search JANO across connected cultural knowledge for "${q}".`
          : 'Search JANO across connected cultural knowledge.',
        robots: 'noindex,follow',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
      });

      return this.api
        .search({
          q,
          limit: 40,
          page: Number(params.get('page') ?? 1),
          image,
          colors,
          layers,
          type: params.get('type') ?? undefined,
          kind: params.get('kind') ?? undefined,
          tag: params.get('tag') ?? undefined,
          locale,
        })
        .pipe(
          map((response) => {
            const vm = { ...response, error: false, loading: false };
            if (!this.count(vm, this.activeFilter())) {
              this.activeFilter.set(this.filters.find((filter) => this.count(vm, filter)) ?? 'ALL');
            }
            return vm;
          }),
          catchError((error: { status?: number }) =>
            of({
              query: q,
              total: 0,
              items: [],
              groups: {},
              sections: [],
              error: true,
              imageExpired: error.status === 410,
              loading: false,
            }),
          ),
          startWith({
            query: q,
            total: 0,
            items: [],
            groups: {},
            sections: [],
            error: false,
            loading: !!(q || image || colors || layers),
          }),
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  changePage(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  hasCriteria(params: ParamMap = this.route.snapshot.queryParamMap): boolean {
    if (['q', 'image', 'colors', 'type', 'kind', 'tag'].some((key) => !!params.get(key)?.trim()))
      return true;
    const raw = params.get('layers')?.trim();
    if (!raw) return false;
    try {
      const layers: unknown = JSON.parse(raw);
      if (!layers || typeof layers !== 'object' || Array.isArray(layers)) return true;
      return Object.values(layers).some(
        (values) =>
          !Array.isArray(values) ||
          values.some((value) => typeof value !== 'string' || !!value.trim()),
      );
    } catch {
      // Invalid criteria stay in search so the API can report the validation error.
      return true;
    }
  }

  heading(q: string) {
    if (q) return this.i18n.t('search.resultsFor') + ' “' + q + '”';
    const params = this.route.snapshot.queryParamMap;
    return this.i18n.t(
      params.has('image')
        ? 'discovery.fromImage'
        : params.has('colors')
          ? 'discovery.fromColor'
          : 'search.explore',
    );
  }

  heroMedia(item: SearchResult) {
    const media = item.resolvedMedia?.card ?? item.resolvedMedia?.thumbnail;
    return media ? { ...media, displayMode: 'CONTAIN' as const, cropZoom: 1 } : null;
  }

  resultLink(result: SearchResult): string[] {
    return result.resultType === 'RESEARCH'
      ? ['/research', result.id]
      : [
          '/entity',
          result.resultType === 'RELATION' ? (result.fromSlug ?? result.slug) : result.slug,
        ];
  }

  typeLabel(result: SearchResult): string {
    return result.resultType === 'ENTITY'
      ? entityTypeLabel(result.type, this.i18n)
      : this.filterLabel(result.resultType);
  }

  reason(result: SearchResult): string {
    const fields = result.matchedFields ?? [];
    const field = [
      'image',
      'color',
      'text',
      'title',
      'summary',
      'content',
      'slug',
      'relation_text',
    ].find((key) => fields.includes(key));
    return this.i18n.t(`search.reason.${field ?? 'related'}`);
  }

  principal(vm: SearchViewModel): SearchResult | undefined {
    return (
      vm.items.find((item) => item.resultType !== 'RELATION') ??
      vm.sections
        ?.flatMap((section) => section.items ?? [])
        .find((item) => item.resultType !== 'RELATION')
    );
  }

  setFilter(filter: SearchFilter): void {
    this.activeFilter.set(filter);
  }

  sections(vm: SearchViewModel): SearchSection[] {
    const filter = this.activeFilter();
    return (vm.sections ?? []).filter((section) => {
      const type = section.items?.[0]?.resultType;
      if (!type) return false;
      if (filter !== 'ALL') return type === filter;
      return (
        type === 'RELATION' || (type === 'ENTITY' && this.visibleItems(section, vm).length > 0)
      );
    });
  }

  count(vm: SearchViewModel, filter: SearchFilter): number {
    return filter === 'ALL'
      ? Number(!!this.principal(vm))
      : (vm.sections ?? [])
          .filter((section) => section.items?.[0]?.resultType === filter)
          .reduce((sum, section) => sum + (section.total ?? section.items?.length ?? 0), 0);
  }

  visibleItems(section: SearchSection, vm: SearchViewModel): SearchResult[] {
    if (this.activeFilter() !== 'ALL') return section.items ?? [];
    const principal = this.principal(vm);
    return (section.items ?? [])
      .filter(
        (item) =>
          item.id !== principal?.id && (principal?.type !== 'ARTWORK' || item.type === 'ARTWORK'),
      )
      .slice(0, 2);
  }

  tabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
    buttons[index].click();
  }

  sectionLabel(section: SearchSection): string {
    return this.filterLabel(section.items?.[0]?.resultType ?? 'ALL');
  }

  filterLabel(filter: SearchFilter): string {
    return this.i18n.t(
      filter === 'ALL'
        ? 'search.best'
        : filter === 'RELATION'
          ? 'discovery.connections'
          : `search.filter.${filter.toLowerCase()}`,
    );
  }
}
