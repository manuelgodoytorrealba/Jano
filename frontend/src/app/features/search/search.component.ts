import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, shareReplay, switchMap } from 'rxjs';
import { SearchApi, SearchResponse, SearchResult, SearchSection } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type SearchViewModel = SearchResponse & {
  error: boolean;
};

type SearchFilter = 'ALL' | SearchResult['resultType'];

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [AsyncPipe, JanoMediaComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  readonly activeFilter = signal<SearchFilter>('ALL');
  readonly expandedSections = signal<Set<string>>(new Set());
  readonly filters: SearchFilter[] = ['ALL', 'ENTITY', 'RESEARCH', 'RELATION'];
  searchInput = this.route.snapshot.queryParamMap.get('q') ?? '';

  readonly q$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly vm$ = this.q$.pipe(
    switchMap((q) => {
      const locale = this.i18n.locale();
      this.searchInput = q;
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
          })),
          catchError(() =>
            of({ query: q, total: 0, items: [], groups: {}, sections: [], error: true }),
          ),
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  go(result: SearchResult): void {
    if (result.resultType === 'RESEARCH') {
      void this.router.navigate(['/research'], { queryParams: { focus: result.id } });
      return;
    }

    if (result.resultType === 'RELATION') {
      void this.router.navigate(['/entity', result.fromSlug], {
        queryParams: { workspace: 'graph' },
      });
      return;
    }

    void this.router.navigate(['/entity', result.slug]);
  }

  setFilter(filter: SearchFilter): void {
    this.activeFilter.set(filter);
  }

  sections(vm: SearchViewModel): SearchSection[] {
    const filter = this.activeFilter();
    return (vm.sections ?? []).filter(
      (section) => filter === 'ALL' || section.items?.some((item) => item.resultType === filter),
    );
  }

  count(vm: SearchViewModel, filter: SearchFilter): number {
    return filter === 'ALL'
      ? vm.total
      : ((vm.sections ?? []).find((section) => section.items?.[0]?.resultType === filter)?.total ??
          0);
  }

  visibleItems(section: SearchSection): SearchResult[] {
    const items = section.items ?? [];
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
    return section.key === 'research' ? this.i18n.t('search.filter.research') : section.title;
  }

  filterLabel(filter: SearchFilter): string {
    return this.i18n.t(`search.filter.${filter.toLowerCase()}`);
  }
}
