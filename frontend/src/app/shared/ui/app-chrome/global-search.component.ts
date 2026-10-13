import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  PLATFORM_ID,
  inject,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap } from 'rxjs';
import { SearchApi, SearchResult } from '../../../core/api/search.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { entityTypeLabel } from '../../../core/i18n/domain-labels';
import { navigateToAppSearch } from '../../../core/search/search-navigation';

type SearchCategoryType =
  | 'ARTIST'
  | 'ARTWORK'
  | 'MOVEMENT'
  | 'CONCEPT'
  | 'ARTICLE'
  | 'PLACE'
  | 'PERIOD';

const SEARCH_CATEGORIES: Array<{
  type: SearchCategoryType;
  labelKey: string;
  icon: 'artist' | 'movement' | 'concept' | 'artwork' | 'article' | 'place' | 'period';
}> = [
  { type: 'ARTIST', labelKey: 'search.type.artists', icon: 'artist' },
  { type: 'MOVEMENT', labelKey: 'search.type.movements', icon: 'movement' },
  { type: 'CONCEPT', labelKey: 'search.type.concepts', icon: 'concept' },
  { type: 'ARTWORK', labelKey: 'search.type.artworks', icon: 'artwork' },
  { type: 'ARTICLE', labelKey: 'search.type.articles', icon: 'article' },
  { type: 'PLACE', labelKey: 'search.type.places', icon: 'place' },
  { type: 'PERIOD', labelKey: 'search.type.periods', icon: 'period' },
];

@Component({
  standalone: true,
  selector: 'app-global-search',
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchComponent {
  readonly navigated = output<void>();
  private readonly router = inject(Router);
  private readonly searchApi = inject(SearchApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly i18n = inject(I18nService);

  readonly searchDraft = signal('');
  readonly searchSuggestions = signal<SearchResult[]>([]);
  readonly searchFocused = signal(false);
  readonly searchLoading = signal(false);
  readonly categories = SEARCH_CATEGORIES;
  readonly activeSuggestionIndex = signal(-1);
  readonly recentSearches = signal<string[]>(this.readRecentSearches());

  private readonly searchInput$ = new Subject<string>();
  private readonly preventPageTouchMove = (event: TouchEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.app-chrome__mobile-search-filters, .app-chrome__search-suggestions')) {
      return;
    }
    event.preventDefault();
  };

  @HostBinding('class.search-open')
  get searchOpen(): boolean {
    return this.searchFocused();
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.lockPageTouch(false));

    this.searchInput$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((value) => {
          const q = value.trim();
          if (!q) {
            this.searchLoading.set(false);
            return of([]);
          }
          this.searchLoading.set(true);
          return this.searchApi.search({ q, limit: 6 }).pipe(
            map((response) => response.items.slice(0, 6)),
            catchError(() => of([])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.searchSuggestions.set(items);
        this.activeSuggestionIndex.set(items.length ? 0 : -1);
        this.searchLoading.set(false);
      });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (this.searchFocused() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeSearchUi();
    }
  }

  onSearchInput(value: string): void {
    this.searchDraft.set(value);
    this.setSearchFocused(true);
    this.activeSuggestionIndex.set(-1);
    this.searchInput$.next(value);
  }

  onSearchFocus(value: string): void {
    this.setSearchFocused(true);
    if (value.trim() && !this.searchSuggestions().length) this.searchInput$.next(value);
  }

  showPreparationPanel(): boolean {
    return this.searchFocused() && !this.searchDraft().trim();
  }

  showSearchSuggestions(): boolean {
    return this.searchFocused() && !!this.searchDraft().trim();
  }

  openPreparationCategory(type: SearchCategoryType): void {
    this.closeForNavigation();
    void this.router.navigateByUrl(searchCategoryRoute(type));
  }

  openMobileDiscovery(route: string): void {
    this.closeForNavigation();
    void this.router.navigateByUrl(route);
  }

  scrollMobileCategories(container: HTMLElement): void {
    container.scrollBy({ left: container.clientWidth * 0.72, behavior: 'smooth' });
  }

  moveSearchSuggestion(delta: number): void {
    this.activeSuggestionIndex.set(
      nextSuggestionIndex(this.activeSuggestionIndex(), delta, this.searchSuggestions().length),
    );
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveSearchSuggestion(event.key === 'ArrowDown' ? 1 : -1);
    }
  }

  onSearchSuggestionsWheel(event: WheelEvent): void {
    if (!this.searchSuggestions().length) return;
    event.preventDefault();
    this.moveSearchSuggestion(event.deltaY > 0 ? 1 : -1);
  }

  setActiveSearchSuggestion(index: number): void {
    this.activeSuggestionIndex.set(index);
  }

  chooseSearchSuggestion(input: HTMLInputElement, item: SearchResult): void {
    this.reset(input);
    void navigateToAppSearch(this.router, item.title);
  }

  clearSearchInput(input: HTMLInputElement): void {
    input.value = '';
    this.searchDraft.set('');
    this.searchSuggestions.set([]);
    this.activeSuggestionIndex.set(-1);
    this.searchLoading.set(false);
    input.focus();
  }

  onSearchSubmit(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const query = input.value;
    this.recordRecentSearch(query);
    this.reset(input);
    void navigateToAppSearch(this.router, query);
  }

  chooseRecentSearch(input: HTMLInputElement, query: string): void {
    input.value = query;
    this.recordRecentSearch(query);
    this.reset(input);
    void navigateToAppSearch(this.router, query);
  }

  chooseSearchPrompt(input: HTMLInputElement): void {
    this.chooseRecentSearch(input, this.i18n.t('search.promptQuery'));
  }

  entityLabel(type: string | null | undefined): string {
    return entityTypeLabel(type, this.i18n);
  }

  closeSearchUi(): void {
    this.setSearchFocused(false);
    this.activeSuggestionIndex.set(-1);
  }

  exitMobileSearch(input: HTMLInputElement): void {
    input.blur();
    this.closeSearchUi();
  }

  private reset(input: HTMLInputElement): void {
    input.value = '';
    this.searchDraft.set('');
    this.searchSuggestions.set([]);
    this.activeSuggestionIndex.set(-1);
    this.setSearchFocused(false);
    this.navigated.emit();
  }

  private closeForNavigation(): void {
    this.closeSearchUi();
    this.navigated.emit();
  }

  private setSearchFocused(focused: boolean): void {
    this.searchFocused.set(focused);
    this.lockPageTouch(focused);
  }

  private lockPageTouch(locked: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.document.documentElement.classList.toggle('app-search-open', locked);
    if (locked) {
      this.document.addEventListener('touchmove', this.preventPageTouchMove, { passive: false });
    } else {
      this.document.removeEventListener('touchmove', this.preventPageTouchMove);
    }
  }

  private readRecentSearches(): string[] {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      const searches = JSON.parse(window.localStorage.getItem('jano.search.recents') ?? '[]');
      return Array.isArray(searches)
        ? searches.filter((query): query is string => typeof query === 'string').slice(0, 4)
        : [];
    } catch {
      return [];
    }
  }

  private recordRecentSearch(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query) return;

    this.recentSearches.update((searches) => {
      const next = [
        query,
        ...searches.filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase()),
      ].slice(0, 4);
      if (isPlatformBrowser(this.platformId)) {
        window.localStorage.setItem('jano.search.recents', JSON.stringify(next));
      }
      return next;
    });
  }
}

export function nextSuggestionIndex(current: number, delta: number, total: number): number {
  return total ? (current + delta + total) % total : -1;
}

function searchCategoryRoute(type: SearchCategoryType): string {
  return `/entities/${type.toLowerCase()}`;
}
