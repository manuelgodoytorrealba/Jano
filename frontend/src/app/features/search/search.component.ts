import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs';
import {
  SearchApi,
  SearchDeck,
  SearchResponse,
  SearchResult,
  SearchRoute,
  SearchSection,
} from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type SearchType =
  | ''
  | 'ARTWORK'
  | 'ARTIST'
  | 'ARTICLE'
  | 'CONCEPT'
  | 'MOVEMENT'
  | 'PERIOD'
  | 'PLACE'
  | 'TEXT';
type SearchViewModel = SearchResponse & { activeType: SearchType; activeTag: string };

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
  readonly types: SearchType[] = [
    '',
    'ARTIST',
    'ARTWORK',
    'MOVEMENT',
    'CONCEPT',
    'ARTICLE',
    'PLACE',
    'PERIOD',
  ];
  searchInput = this.route.snapshot.queryParamMap.get('q') ?? '';

  readonly q$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly type$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('type') ?? '').toUpperCase() as SearchType),
    map((type) => (this.types.includes(type) ? type : '')),
    distinctUntilChanged(),
  );

  readonly tag$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('tag') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly vm$ = combineLatest([this.q$, this.type$, this.tag$]).pipe(
    switchMap(([q, type, tag]) => {
      this.searchInput = q;
      this.seo.setPageMeta({
        title: q ? `Search "${q}" | JANO` : 'Search | JANO',
        description: q
          ? `Search JANO across artworks, artists, articles, movements, periods and concepts for "${q}".`
          : 'Search JANO.',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
      });

      return this.api
        .search({
          q,
          type: type || undefined,
          tag: tag || undefined,
          limit: 40,
        })
        .pipe(
          map((response) => ({
            ...response,
            activeType: type,
            activeTag: tag,
          })),
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  setType(type: SearchType): void {
    void this.router.navigate(['/search'], {
      queryParams: {
        q: this.searchInput.trim() || null,
        type: type || null,
        tag: this.route.snapshot.queryParamMap.get('tag') || null,
      },
    });
  }

  clearTag(): void {
    void this.router.navigate(['/search'], {
      queryParams: {
        q: this.searchInput.trim() || null,
        type: this.route.snapshot.queryParamMap.get('type') || null,
        tag: null,
      },
    });
  }

  go(result: SearchResult): void {
    void this.router.navigate(['/entity', result.slug]);
  }

  goDeck(deck: SearchDeck): void {
    void this.router.navigate(['/entities'], { queryParams: { deck: deck.slug } });
  }

  openGraph(result: SearchResult | null | undefined): void {
    if (!result || !this.canOpenGraph(result)) {
      return;
    }

    void this.router.navigate(['/entity', result.slug], {
      queryParams: { workspace: 'graph' },
    });
  }

  displaySections(vm: { items: SearchResult[]; sections?: SearchSection[] }): SearchSection[] {
    return vm.sections?.length
      ? vm.sections
      : [{ key: 'main', title: this.sectionTitle('main'), items: vm.items }];
  }

  hasSectionContent(section: SearchSection): boolean {
    return !!section.items?.length || !!section.routes?.length || !!section.decks?.length;
  }

  isDiscoveryLayout(vm: SearchViewModel): boolean {
    return !vm.activeType && !vm.activeTag;
  }

  heroItem(vm: SearchViewModel): SearchResult | null {
    return this.primaryItems(vm)[0] ?? null;
  }

  highlightItems(vm: SearchViewModel): SearchResult[] {
    const heroId = this.heroItem(vm)?.id ?? null;
    return this.primaryItems(vm)
      .filter((item) => item.id !== heroId)
      .slice(0, 4);
  }

  sectionItems(vm: SearchViewModel, key: string, limit: number): SearchResult[] {
    return (this.section(vm, key)?.items ?? []).slice(0, limit);
  }

  sectionRoutes(vm: SearchViewModel, key: string, limit: number): SearchRoute[] {
    return (this.section(vm, key)?.routes ?? []).slice(0, limit);
  }

  sectionDecks(vm: SearchViewModel, key: string, limit: number): SearchDeck[] {
    return (this.section(vm, key)?.decks ?? []).slice(0, limit);
  }

  sectionTotal(vm: SearchViewModel, key: string): number {
    const section = this.section(vm, key);
    if (!section) {
      return 0;
    }

    return (
      section.total ?? section.items?.length ?? section.routes?.length ?? section.decks?.length ?? 0
    );
  }

  canOpenGraph(item: SearchResult | null | undefined): boolean {
    return !!item && item.type !== 'ARTICLE' && item.type !== 'TEXT';
  }

  resultMetaLine(item: SearchResult | null | undefined): string {
    if (!item) {
      return '';
    }

    const parts = [this.typeLabel(item.type), this.yearLabel(item)].filter(
      (value): value is string => !!value,
    );
    return parts.join(' · ');
  }

  sectionActionLabel(key: string, total = 0): string {
    const suffix = total > 0 ? ` (${total})` : '';

    switch (key) {
      case 'keyWorks':
        return this.i18n.t('search.viewAllArtworks') + suffix;
      case 'concepts':
        return this.i18n.t('search.viewAllConcepts') + suffix;
      case 'articles':
        return this.i18n.t('search.viewAllArticles') + suffix;
      case 'routes':
        return total > 0
          ? `${this.i18n.t('search.openRelationsMap')} (${total})`
          : this.i18n.t('search.openRelationsMap');
      default:
        return this.i18n.t('search.viewAll') + suffix;
    }
  }

  hasSectionAction(key: string, hero?: SearchResult | null): boolean {
    return !!this.sectionActionType(key) || (key === 'routes' && this.canOpenGraph(hero));
  }

  openSection(key: string, hero?: SearchResult | null): void {
    const type = this.sectionActionType(key);

    if (type) {
      this.setType(type);
      return;
    }

    if (key === 'routes') {
      this.openGraph(hero);
    }
  }

  typeLabel(type: SearchType | string): string {
    const labels: Record<string, string> = {
      '': this.i18n.t('search.type.all'),
      ARTIST: this.i18n.t('search.type.artists'),
      ARTWORK: this.i18n.t('search.type.artworks'),
      MOVEMENT: this.i18n.t('search.type.movements'),
      CONCEPT: this.i18n.t('search.type.concepts'),
      ARTICLE: this.i18n.t('search.type.articles'),
      PLACE: this.i18n.t('search.type.places'),
      PERIOD: this.i18n.t('search.type.periods'),
    };
    return (
      labels[String(type)] ??
      String(type)
        .toLowerCase()
        .replace(/^\w/, (char) => char.toUpperCase())
    );
  }

  sectionTitle(key: string, fallback = ''): string {
    return this.i18n.t('search.section.' + key) || fallback;
  }

  relationLine(item: SearchResult): string {
    return item.relationWithTitle
      ? this.i18n
          .t('search.relatedLine')
          .replace('{from}', item.title)
          .replace('{to}', item.relationWithTitle)
      : this.i18n.t('search.whyRelated');
  }

  cleanSummary(value: string | null | undefined): string {
    return (value ?? '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1');
  }

  private primaryItems(vm: SearchViewModel): SearchResult[] {
    const mainItems = this.section(vm, 'main')?.items;
    return mainItems?.length ? mainItems : vm.items;
  }

  private section(vm: SearchViewModel, key: string): SearchSection | null {
    return this.displaySections(vm).find((section) => section.key === key) ?? null;
  }

  private yearLabel(item: SearchResult): string | null {
    if (!item.startYear && !item.endYear) {
      return null;
    }

    return `${item.startYear ?? ''}${item.endYear ? `–${item.endYear}` : ''}`;
  }

  private sectionActionType(key: string): SearchType | null {
    switch (key) {
      case 'keyWorks':
        return 'ARTWORK';
      case 'concepts':
        return 'CONCEPT';
      case 'articles':
        return 'ARTICLE';
      default:
        return null;
    }
  }
}
