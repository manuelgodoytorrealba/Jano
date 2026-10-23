import { AppLoadingComponent } from '../../shared/ui/app-loading/app-loading.component';
import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  effect,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, tap } from 'rxjs';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { EntityArtworkTransitionPayload } from '../../core/entity-route-artwork-transition.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/auth/auth.service';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { EntitiesExplorer3dComponent } from '../entities-explorer-3d/entities-explorer-3d.component';
import { EntitiesExplorerTotemComponent } from '../entities-explorer-totem/entities-explorer-totem.component';
import {
  EntitiesListActiveFilterKey,
  EntitiesListFacade,
  FilterMenuKey,
  Level,
  Sort,
  Status,
} from './entities-list.facade';
import { EntitiesListEmptyStateComponent } from './entities-list-empty-state.component';
import { EntitiesListFilterRailComponent } from './entities-list-filter-rail.component';
import { EntitiesListPagerComponent } from './entities-list-pager.component';

type ViewMode = 'explore' | 'list';

const ENTITY_TYPE_LABEL_KEYS: Record<string, string> = {
  PERSON: 'search.kind.people',
  WORK: 'search.kind.works',
  ABSTRACTION: 'search.kind.abstractions',
  EVENT: 'search.kind.events',
  ORGANIZATION: 'search.kind.organizations',
  ARTWORK: 'entities.type.artworkSingular',
  ARTICLE: 'entity.article',
  ARTIST: 'entities.type.artistSingular',
  MOVEMENT: 'entities.type.movementSingular',
  PERIOD: 'entities.type.periodSingular',
  CONCEPT: 'entities.type.conceptSingular',
  PLACE: 'entities.type.placeSingular',
  TEXT: 'entities.type.textSingular',
};

const STATUS_KEYS: Record<Exclude<Status, ''>, string> = {
  DRAFT: 'status.draft',
  IN_REVIEW: 'status.inReview',
  PUBLISHED: 'status.published',
};

const CONTENT_LEVEL_KEYS: Record<Exclude<Level, ''>, string> = {
  BASIC: 'level.basic',
  INTERMEDIATE: 'level.intermediate',
  ADVANCED: 'level.advanced',
};

type ArchiveVisitState = {
  viewMode: ViewMode;
  activeSlug: string | null;
  scrollTop: number;
  windowY: number;
  filtersOpen: boolean;
  infoOpen: boolean;
  focusedSlug: string | null;
};

@Component({
  standalone: true,
  selector: 'app-entities-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EntitiesListFacade],
  imports: [
    AsyncPipe,
    AppLoadingComponent,
    RouterLink,
    EntitiesExplorer3dComponent,
    EntitiesExplorerTotemComponent,
    JanoMediaComponent,
    EntitiesListFilterRailComponent,
    EntitiesListPagerComponent,
    EntitiesListEmptyStateComponent,
  ],
  templateUrl: './entities-list.component.html',
  styleUrls: ['./entities-list.component.scss'],
})
export class EntitiesListComponent {
  private readonly facade = inject(EntitiesListFacade);
  readonly isDiscoveryFeed = this.facade.isDiscoveryFeed;
  readonly feedLoading = this.facade.feedLoading;
  readonly feedError = this.facade.feedError;
  readonly explorerPreviousItems = this.facade.explorerPreviousItems;
  readonly explorerNextItems = this.facade.explorerNextItems;
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly isAdmin = signal(this.auth.currentUser?.role === 'ADMIN');

  private readonly navigation = inject(NavigationMemoryService);
  private readonly injector = inject(Injector);
  private items: PublicEntityListItem[] = [];
  private restoredKey = '';
  private pendingScroll: ArchiveVisitState | null = null;
  readonly pageVm$ = this.facade.pageVm$;
  private pendingPageDirection: -1 | 1 | null = null;
  private scrollOnPageLoad = false;
  @ViewChild('listStage') listStage?: ElementRef<HTMLElement>;
  readonly skeleton = Array.from({ length: 8 });
  readonly filterSkeleton = Array.from({ length: 4 });
  readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 0);
  readonly viewportHeight = signal(typeof window !== 'undefined' ? window.innerHeight : 0);
  readonly activeIndex = signal(0);
  readonly advancedFiltersOpen = signal(false);
  readonly filtersPanelOpen = signal(false);
  readonly infoPanelOpen = signal(false);
  readonly openFilterMenu = signal<FilterMenuKey | null>(null);

  viewMode: ViewMode = this.preferredView();

  private preferredView(): ViewMode {
    if (this.isDiscoveryFeed && typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem('jano.home.view') === 'list' ? 'list' : 'explore';
      } catch {
        // Storage may be unavailable; keep Explorer as the default.
      }
    }
    return 'explore';
  }

  constructor() {
    this.restoreVisit();
    this.navigation.register(
      'archive',
      () =>
        ({
          viewMode: this.viewMode,
          activeSlug: this.items[this.activeIndex()]?.slug ?? null,
          scrollTop: this.pendingScroll?.scrollTop ?? this.listStage?.nativeElement.scrollTop ?? 0,
          windowY:
            this.pendingScroll?.windowY ?? (typeof window === 'undefined' ? 0 : window.scrollY),
          filtersOpen: this.filtersPanelOpen(),
          infoOpen: this.infoPanelOpen(),
          focusedSlug:
            typeof document === 'undefined'
              ? null
              : (document.activeElement
                  ?.closest('a[href*="/entity/"]')
                  ?.getAttribute('href')
                  ?.split('/entity/')[1] ?? null),
        }) satisfies ArchiveVisitState,
      inject(DestroyRef),
    );
    effect(() => {
      this.navigation.visit();
      this.restoreVisit();
    });
    this.auth.user$.pipe(takeUntilDestroyed()).subscribe((user) => {
      this.isAdmin.set(user?.role === 'ADMIN');
    });
    this.facade.results$
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.page === b.page &&
            a.items.map((item) => item.slug).join() === b.items.map((item) => item.slug).join(),
        ),
        tap((results) => {
          this.items = results.items;
          if (this.isMobilePortraitTotemActive()) this.facade.prepareExplorerPages(results);
          const restored = this.navigation.read<ArchiveVisitState>('archive');
          const restoredIndex = restored?.activeSlug
            ? results.items.findIndex((item) => item.slug === restored.activeSlug)
            : -1;
          const total = results.items.length;
          const nextIndex =
            restoredIndex >= 0
              ? restoredIndex
              : this.pendingPageDirection === 1
                ? 0
                : this.pendingPageDirection === -1
                  ? Math.max(0, total - 1)
                  : 0;
          this.pendingPageDirection = null;
          this.restoreVisit();
          if (restored) this.restoreScroll(restored);
          if (this.scrollOnPageLoad && typeof window !== 'undefined') {
            if (this.listStage) this.listStage.nativeElement.scrollTop = 0;
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
          this.scrollOnPageLoad = false;
          if (this.activeIndex() !== nextIndex) {
            this.activeIndex.set(nextIndex);
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  private restoreVisit(): void {
    const state = this.navigation.read<ArchiveVisitState>('archive');
    const key = this.navigation.visit().key;
    if (!state || this.restoredKey === key) return;
    this.restoredKey = key;
    this.pendingScroll = state;
    this.viewMode = state.viewMode === 'list' ? 'list' : 'explore';
    this.filtersPanelOpen.set(Boolean(state.filtersOpen));
    this.infoPanelOpen.set(Boolean(state.infoOpen));
    const index = this.items.findIndex((item) => item.slug === state.activeSlug);
    if (index >= 0) this.activeIndex.set(index);
  }

  isRestoredVisit(): boolean {
    return this.restoredKey === this.navigation.visit().key && !!this.restoredKey;
  }

  private restoreScroll(state: ArchiveVisitState): void {
    this.pendingScroll = state;
    const key = this.navigation.visit().key;
    afterNextRender(
      () => {
        if (this.navigation.visit().key !== key) return;
        if (this.listStage) this.listStage.nativeElement.scrollTop = state.scrollTop;
        window.scrollTo({ top: state.windowY, behavior: 'instant' });
        this.pendingScroll = null;
        if (state.focusedSlug)
          document
            .querySelector<HTMLAnchorElement>(`a[href="/entity/${CSS.escape(state.focusedSlug)}"]`)
            ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  isMobilePortraitTotem(): boolean {
    return this.viewportWidth() <= 720 && this.viewportHeight() > this.viewportWidth();
  }

  isMobilePortraitTotemActive(): boolean {
    return this.viewMode === 'explore' && this.isMobilePortraitTotem();
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (typeof window === 'undefined') {
      return;
    }

    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);

    if (this.isMobilePortraitTotem()) {
      if (this.viewMode === 'explore') this.facade.prepareExplorerPages();
      this.infoPanelOpen.set(false);
      return;
    }

    this.infoPanelOpen.set(true);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.filtersPanelOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('.entities-filter-rail, .entities-hud__filters')) {
      return;
    }

    this.filtersPanelOpen.set(false);
    this.closeFilterMenu();
  }

  setView(mode: ViewMode) {
    this.closeFilterMenu();
    this.viewMode = mode;
    if (this.isMobilePortraitTotemActive()) this.facade.prepareExplorerPages();
    if (this.isDiscoveryFeed && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('jano.home.view', mode);
      } catch {
        // Switching views still works when storage is unavailable.
      }
    }
  }

  renewSelection(): void {
    this.activeIndex.set(0);
    this.infoPanelOpen.set(false);
    this.pendingScroll = null;
    this.scrollOnPageLoad = true;
    void this.facade.renewSelection();
  }

  toggleFiltersPanel() {
    this.filtersPanelOpen.update((value) => {
      const next = !value;

      if (!next) {
        this.closeFilterMenu();
      }

      if (next && this.isMobilePortraitTotemActive()) {
        this.infoPanelOpen.set(false);
      }

      return next;
    });
  }

  closeInfoPanel() {
    this.infoPanelOpen.set(false);
  }

  breadcrumbSectionLabel(pageVm: { title: string; type: string }): string {
    if (this.isDiscoveryFeed) return this.i18n.t('nav.discover');
    if ((pageVm.type ?? '').toUpperCase() === 'ARTICLE') {
      return this.i18n.t('nav.articles');
    }

    return this.i18n.t('nav.explore');
  }

  breadcrumbSectionRoute(pageVm: { title: string; type: string }): string {
    void pageVm;
    return this.isDiscoveryFeed ? '/home' : '/entities';
  }

  breadcrumbCurrentLabel(pageVm: {
    title: string;
    type: string;
    recommendationsActive?: boolean;
  }): string {
    if ((pageVm.type ?? '').toUpperCase() === 'ARTICLE') {
      return '';
    }

    return pageVm.type ? pageVm.title : '';
  }

  openInfoPanel() {
    if (this.isMobilePortraitTotemActive()) {
      this.filtersPanelOpen.set(false);
      this.closeFilterMenu();
    }

    this.infoPanelOpen.set(true);
  }

  toggleFilterMenu(key: FilterMenuKey) {
    this.openFilterMenu.update((current) => (current === key ? null : key));
  }

  closeFilterMenu() {
    this.openFilterMenu.set(null);
  }

  selectFilterOption(key: FilterMenuKey, value: string) {
    switch (key) {
      case 'type':
        this.setType(value);
        break;
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

  clearActiveFilter(key: EntitiesListActiveFilterKey) {
    switch (key) {
      case 'type':
        this.setType('');
        break;
      case 'status':
        this.toggleStatus('');
        break;
      case 'contentLevel':
        this.toggleContentLevel('');
        break;
      case 'movement':
        this.setMovement('');
        break;
      case 'period':
        this.setPeriod('');
        break;
      case 'institution':
        this.setInstitution('');
        break;
      case 'nationality':
        this.setNationality('');
        break;
      case 'tag':
        this.setTag('');
        break;
    }
  }

  toggleAdvancedFilters() {
    this.advancedFiltersOpen.update((value) => !value);
  }

  statusLabel(value: string | null | undefined): string {
    const key = (value ?? '').trim() as Exclude<Status, ''>;
    return STATUS_KEYS[key] ? this.i18n.t(STATUS_KEYS[key]) : key;
  }

  contentLevelLabel(value: string | null | undefined): string {
    const key = (value ?? '').trim() as Exclude<Level, ''>;
    return CONTENT_LEVEL_KEYS[key] ? this.i18n.t(CONTENT_LEVEL_KEYS[key]) : key;
  }

  typeLabel(value: string | null | undefined): string {
    const key = (value ?? '').trim().toUpperCase();
    return ENTITY_TYPE_LABEL_KEYS[key] ? this.i18n.t(ENTITY_TYPE_LABEL_KEYS[key]) : key;
  }

  cleanWiki(text: string): string {
    if (!text) {
      return '';
    }

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
    const normalizedText = (text ?? '').toString();
    const normalizedQuery = (query ?? '').trim();
    if (!normalizedQuery) {
      return this.escapeHtml(normalizedText);
    }

    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'ig');
    const parts = normalizedText.split(regex);
    const matches = normalizedText.match(regex);

    if (!matches) {
      return this.escapeHtml(normalizedText);
    }

    let output = '';
    for (let i = 0; i < parts.length; i += 1) {
      output += this.escapeHtml(parts[i]);
      if (i < matches.length) {
        output += `<mark>${this.escapeHtml(matches[i])}</mark>`;
      }
    }

    return output;
  }

  clearSearch() {
    void this.facade.clearSearch();
  }

  returnToDiscovery() {
    void this.facade.navigateHome();
  }

  setQ(value: string) {
    void this.facade.setQuery(value);
  }

  setType(value: string) {
    void this.facade.setType(value);
  }

  toggleSort(next: Sort) {
    void this.facade.toggleSort(next);
  }

  prevPage() {
    this.scrollOnPageLoad = true;
    void this.facade.goToPreviousPage();
  }

  nextPage(totalPages: number) {
    this.scrollOnPageLoad = true;
    void this.facade.goToNextPage(totalPages);
  }

  changeExplorerPage(direction: -1 | 1, totalPages: number) {
    if (this.pendingPageDirection !== null) return;
    this.pendingPageDirection = direction;
    const navigation =
      direction === 1 ? this.facade.goToNextPage(totalPages) : this.facade.goToPreviousPage();
    void navigation.then((changed) => {
      if (!changed) this.pendingPageDirection = null;
    });
  }

  toggleStatus(next: Status) {
    void this.facade.toggleStatus(next);
  }

  toggleContentLevel(next: Level) {
    void this.facade.toggleContentLevel(next);
  }

  setMovement(next: string) {
    void this.facade.setMovement(next);
  }

  setPeriod(next: string) {
    void this.facade.setPeriod(next);
  }

  setInstitution(next: string) {
    void this.facade.setInstitution(next);
  }

  setNationality(next: string) {
    void this.facade.setNationality(next);
  }

  setTag(next: string) {
    void this.facade.setTag(next);
  }

  resetFilters() {
    void this.facade.resetFilters();
  }

  go(request: string | EntityArtworkTransitionPayload) {
    void this.facade.navigateToEntity(request);
  }

  onExploreClick(items: PublicEntityListItem[], index: number) {
    if (index !== this.activeIndex()) {
      this.activeIndex.set(index);
      return;
    }

    const entity = items[index];
    if (entity?.slug) {
      this.go(entity.slug);
    }
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
