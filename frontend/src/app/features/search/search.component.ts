import { toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
  startWith,
  Subject,
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
  loading: boolean;
};

type SearchFilter = 'ALL' | SearchResult['resultType'];

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [AsyncPipe, JanoMediaComponent, RouterLink, AppLoadingComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  readonly activeFilter = signal<SearchFilter>('ALL');
  readonly expandedSections = signal<Set<string>>(new Set());
  readonly filters: SearchFilter[] = ['ALL', 'ENTITY', 'RESEARCH', 'RELATION'];

  readonly q$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly retry$ = new Subject<void>();

  readonly vm$ = combineLatest([
    this.q$,
    this.retry$.pipe(startWith(undefined)),
    toObservable(this.i18n.locale),
  ]).pipe(
    switchMap(([q, , locale]) => {
      this.activeFilter.set('ALL');
      this.expandedSections.set(new Set());
      this.seo.setPageMeta({
        title: q ? `Search "${q}" | JANO` : 'Search | JANO',
        description: q
          ? `Search JANO across connected cultural knowledge for "${q}".`
          : 'Search JANO across connected cultural knowledge.',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
      });

      return this.api
        .search({
          q,
          limit: 40,
          locale,
        })
        .pipe(
          map((response) => ({
            ...response,
            error: false,
            loading: false,
          })),
          catchError(() =>
            of({
              query: q,
              total: 0,
              items: [],
              groups: {},
              sections: [],
              error: true,
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
            loading: !!q,
          }),
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

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
    const field = ['title', 'summary', 'content', 'slug', 'relation_text'].find((key) =>
      fields.includes(key),
    );
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
    return (vm.sections ?? []).filter(
      (section) =>
        !!section.items?.length &&
        (filter === 'ALL' || section.items.some((item) => item.resultType === filter)),
    );
  }

  count(vm: SearchViewModel, filter: SearchFilter): number {
    return filter === 'ALL'
      ? vm.total
      : ((vm.sections ?? []).find((section) => section.items?.[0]?.resultType === filter)?.total ??
          0);
  }

  visibleItems(section: SearchSection, vm: SearchViewModel): SearchResult[] {
    const items = (section.items ?? []).filter((item) => item.id !== this.principal(vm)?.id);
    return this.expandedSections().has(section.key) ? items : items.slice(0, 2);
  }

  canExpand(section: SearchSection): boolean {
    return (section.items?.length ?? 0) > 2;
  }

  toggleSection(key: string): void {
    this.expandedSections.update((sections) => {
      const next = new Set(sections);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  sectionLabel(section: SearchSection): string {
    return this.filterLabel(section.items?.[0]?.resultType ?? 'ALL');
  }

  filterLabel(filter: SearchFilter): string {
    return this.i18n.t(`search.filter.${filter.toLowerCase()}`);
  }
}
