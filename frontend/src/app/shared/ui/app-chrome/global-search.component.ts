import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap } from 'rxjs';
import { SearchApi, SearchResult } from '../../../core/api/search.api';
import { I18nService } from '../../../core/i18n/i18n.service';
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
  private readonly router = inject(Router);
  private readonly searchApi = inject(SearchApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly i18n = inject(I18nService);

  readonly searchDraft = signal('');
  readonly searchSuggestions = signal<SearchResult[]>([]);
  readonly searchFocused = signal(false);
  readonly searchLoading = signal(false);
  readonly categories = SEARCH_CATEGORIES;
  readonly activeSuggestionIndex = signal(-1);

  private readonly searchInput$ = new Subject<string>();

  @HostBinding('class.search-open')
  get searchOpen(): boolean {
    return this.showSearchSuggestions();
  }

  constructor() {
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
    this.searchFocused.set(true);
    this.activeSuggestionIndex.set(-1);
    this.searchInput$.next(value);
  }

  onSearchFocus(value: string): void {
    this.searchFocused.set(true);
    if (value.trim() && !this.searchSuggestions().length) this.searchInput$.next(value);
  }

  showPreparationPanel(): boolean {
    return this.searchFocused() && !this.searchDraft().trim();
  }

  showSearchSuggestions(): boolean {
    return this.searchFocused() && !!this.searchDraft().trim();
  }

  openPreparationCategory(type: SearchCategoryType): void {
    this.closeSearchUi();
    void this.router.navigateByUrl(searchCategoryRoute(type));
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
    this.reset(input);
    void navigateToAppSearch(this.router, query);
  }

  closeSearchUi(): void {
    this.searchFocused.set(false);
    this.activeSuggestionIndex.set(-1);
  }

  private reset(input: HTMLInputElement): void {
    input.value = '';
    this.searchDraft.set('');
    this.searchSuggestions.set([]);
    this.activeSuggestionIndex.set(-1);
    this.searchFocused.set(false);
  }
}

export function nextSuggestionIndex(current: number, delta: number, total: number): number {
  return total ? (current + delta + total) % total : -1;
}

function searchCategoryRoute(type: SearchCategoryType): string {
  return `/entities/${type.toLowerCase()}`;
}
