import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntityListItem, PublicEntityListResponse } from '../../core/api/entities.models';
import {
  EntityArtworkTransitionPayload,
  EntityRouteArtworkTransitionService,
} from '../../core/entity-route-artwork-transition.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { SearchApi } from '../../core/api/search.api';
import { Tag, TagsApi } from '../../core/api/tags.api';
import { AuthService } from '../../core/auth/auth.service';

export type Sort = 'recent' | 'title' | 'relevance';
export type Status = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | '';
export type Level = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | '';
export type FilterMenuKey = 'type' | 'movement' | 'period' | 'institution' | 'nationality' | 'tag';
export type EntityListVm = PublicEntityListResponse<PublicEntityListItem>;
export type TagFilterOption = Pick<Tag, 'slug' | 'label' | 'category'>;
export type EntitiesListActiveFilterKey =
  | 'status'
  | 'contentLevel'
  | 'type'
  | 'movement'
  | 'period'
  | 'institution'
  | 'nationality'
  | 'tag';

type FilterOption = { slug: string; title: string };
type FilterSupport = {
  movement: boolean;
  period: boolean;
  institution: boolean;
  nationality: boolean;
};
type EntitiesListFilterOptionVm = { slug: string; label: string };
type EntitiesListQueryState = {
  title: string;
  type: string;
  kind: EntitiesListKind;
  q: string;
  page: number;
  status: Status;
  contentLevel: Level;
  movement: string;
  period: string;
  institution: string;
  nationality: string;
  tag: string;
  sort: Sort;
  filterSupport: FilterSupport;
};

const TYPE_FILTER_OPTIONS: FilterOption[] = [
  { slug: 'artwork', title: 'Obra' },
  { slug: 'artist', title: 'Artista' },
  { slug: 'concept', title: 'Concepto' },
  { slug: 'movement', title: 'Movimiento' },
  { slug: 'period', title: 'Periodo' },
  { slug: 'place', title: 'Lugar' },
  { slug: 'event', title: 'Evento' },
  { slug: 'organization', title: 'Organización' },
  { slug: 'article', title: 'Artículo' },
  { slug: 'text', title: 'Texto' },
];

export type EntitiesListActiveFilterChipVm = {
  key: EntitiesListActiveFilterKey;
  label: string;
  value: string;
  advanced?: boolean;
};

export type EntitiesListSelectFilterVm = {
  key: FilterMenuKey;
  label: string;
  ariaLabel: string;
  optionsLabel: string;
  allLabel: string;
  selectedValue: string;
  selectedLabel: string;
  options: EntitiesListFilterOptionVm[];
};

export type EntitiesListFilterRailVm = {
  searchQuery: string;
  hasActiveFilters: boolean;
  hasVisibleFilterChips: boolean;
  hasAdvancedFilters: boolean;
  activeFilterChips: EntitiesListActiveFilterChipVm[];
  selects: EntitiesListSelectFilterVm[];
  sort: Sort;
  canSortByRelevance: boolean;
  status: Status;
  contentLevel: Level;
  resultsTotal: number;
  page: number;
  totalPages: number;
};

export type EntitiesListPageVm = {
  title: string;
  type: string;
  query: string;
  recommendationsActive: boolean;
  results: EntityListVm;
  filterRail: EntitiesListFilterRailVm;
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

const FILTER_SUPPORT_BY_TYPE: Record<string, FilterSupport> = {
  ARTIST: { movement: true, period: true, institution: false, nationality: true },
  ARTICLE: { movement: false, period: false, institution: false, nationality: false },
  ARTWORK: { movement: true, period: true, institution: true, nationality: false },
  MOVEMENT: { movement: false, period: false, institution: false, nationality: false },
  PERIOD: { movement: false, period: false, institution: false, nationality: false },
  CONCEPT: { movement: false, period: false, institution: false, nationality: false },
};

const TYPE_ROUTE_LABELS: Record<string, string> = {
  artwork: 'entities.type.artwork',
  article: 'entities.type.article',
  artist: 'entities.type.artist',
  movement: 'entities.type.movement',
  period: 'entities.type.period',
  concept: 'entities.type.concept',
  place: 'entities.type.place',
  text: 'entities.type.text',
  event: 'search.kind.events',
  organization: 'search.kind.organizations',
};
const VALID_TYPE_ROUTE_SLUGS = new Set(Object.keys(TYPE_ROUTE_LABELS));

const KNOWLEDGE_KINDS = [
  'PERSON',
  'WORK',
  'ABSTRACTION',
  'EVENT',
  'PLACE',
  'ORGANIZATION',
] as const;
type EntitiesListKind = (typeof KNOWLEDGE_KINDS)[number] | '';
const KIND_LABEL_KEYS: Record<Exclude<EntitiesListKind, ''>, string> = {
  PERSON: 'search.kind.people',
  WORK: 'search.kind.works',
  ABSTRACTION: 'search.kind.abstractions',
  EVENT: 'search.kind.events',
  PLACE: 'search.kind.places',
  ORGANIZATION: 'search.kind.organizations',
};

@Injectable()
export class EntitiesListFacade {
  private readonly api = inject(EntitiesApi);
  private readonly searchApi = inject(SearchApi);
  private readonly tagsApi = inject(TagsApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);

  private readonly limit = 24;
  private readonly contextualFilterKeys = [
    'movement',
    'period',
    'institution',
    'nationality',
  ] as const;

  readonly movementOptions$ = this.api
    .list({
      type: 'MOVEMENT',
      limit: 60,
      page: 1,
      sort: 'title',
      status: 'PUBLISHED',
    })
    .pipe(
      map((result) => this.toFilterOptions(result.items ?? [])),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  readonly periodOptions$ = this.api
    .list({
      type: 'PERIOD',
      limit: 60,
      page: 1,
      sort: 'title',
      status: 'PUBLISHED',
    })
    .pipe(
      map((result) => this.toFilterOptions(result.items ?? [])),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  readonly institutionOptions$ = this.api.institutions().pipe(
    map((items) => (items ?? []).map((item) => ({ slug: item, title: item }))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly nationalityOptions$ = this.api.nationalities().pipe(
    map((items) => (items ?? []).map((item) => ({ slug: item, title: item }))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly tagOptions$ = this.tagsApi.list().pipe(
    map((items) =>
      (items ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => ({
          slug: item.slug,
          label: item.label,
          category: item.category,
        })),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly queryState$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
    map(([paramMap, queryParamMap]) => {
      const routeTypeSlug = (paramMap.get('type') ?? '').toLowerCase();
      const queryTypeSlug = (queryParamMap.get('type') ?? '').toLowerCase();
      const typeSlug = VALID_TYPE_ROUTE_SLUGS.has(routeTypeSlug) ? routeTypeSlug : queryTypeSlug;
      const type = VALID_TYPE_ROUTE_SLUGS.has(typeSlug) ? typeSlug.toUpperCase() : '';
      const requestedKind = (queryParamMap.get('kind') ?? '').trim().toUpperCase();
      const kind =
        !type && KNOWLEDGE_KINDS.includes(requestedKind as (typeof KNOWLEDGE_KINDS)[number])
          ? (requestedKind as EntitiesListKind)
          : '';

      return {
        title: type
          ? this.i18n.t(TYPE_ROUTE_LABELS[typeSlug])
          : kind
            ? this.i18n.t(KIND_LABEL_KEYS[kind])
            : 'Explorar',
        type,
        kind,
        q: (queryParamMap.get('q') ?? '').trim(),
        page: this.toPositiveInt(queryParamMap.get('page')),
        status: this.normalizeStatus(queryParamMap.get('status')),
        contentLevel: this.normalizeContentLevel(queryParamMap.get('contentLevel')),
        movement: (queryParamMap.get('movement') ?? '').trim(),
        period: (queryParamMap.get('period') ?? '').trim(),
        institution: (queryParamMap.get('institution') ?? '').trim(),
        nationality: (queryParamMap.get('nationality') ?? '').trim(),
        tag: (queryParamMap.get('tag') ?? '').trim(),
        sort: this.normalizeSort(queryParamMap.get('sort'), queryParamMap.get('q')),
        filterSupport: this.filterSupportForType(type),
      } satisfies EntitiesListQueryState;
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly results$ = combineLatest([
    this.queryState$.pipe(
      map((state) => state.q),
      debounceTime(300),
    ),
    this.queryState$,
    this.auth.user$,
  ]).pipe(
    switchMap(([debouncedQuery, state, user]) =>
      user && this.shouldUseArchiveRecommendations(state)
        ? this.searchApi.archiveRecommendations(
            state.type ? { type: state.type, limit: this.limit } : { limit: this.limit },
          )
        : this.api.list({
            type: state.type || undefined,
            kind: state.kind || undefined,
            q: debouncedQuery || undefined,
            page: state.page,
            limit: this.limit,
            sort: state.sort === 'relevance' && !debouncedQuery ? 'recent' : state.sort,
            status: state.status || undefined,
            contentLevel: state.contentLevel || undefined,
            movement: state.filterSupport.movement ? state.movement || undefined : undefined,
            period: state.filterSupport.period ? state.period || undefined : undefined,
            institution: state.filterSupport.institution
              ? state.institution || undefined
              : undefined,
            nationality: state.filterSupport.nationality
              ? state.nationality || undefined
              : undefined,
            tag: state.tag || undefined,
          }),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly pageVm$ = combineLatest([
    this.queryState$,
    this.results$,
    this.auth.user$,
    this.movementOptions$,
    this.periodOptions$,
    this.institutionOptions$,
    this.nationalityOptions$,
    this.tagOptions$,
  ]).pipe(
    map(
      ([
        state,
        results,
        user,
        movementOptions,
        periodOptions,
        institutionOptions,
        nationalityOptions,
        tagOptions,
      ]) => {
        const movementLabel = this.findOptionLabel(movementOptions, state.movement);
        const periodLabel = this.findOptionLabel(periodOptions, state.period);
        const institutionLabel = this.findOptionLabel(institutionOptions, state.institution);
        const nationalityLabel = this.findOptionLabel(nationalityOptions, state.nationality);
        const tagLabel = tagOptions.find((item) => item.slug === state.tag)?.label ?? state.tag;

        const activeFilterChips: EntitiesListActiveFilterChipVm[] = [];

        if (state.type) {
          activeFilterChips.push({
            key: 'type',
            label: this.i18n.t('explorer.type'),
            value: this.i18n.t(TYPE_ROUTE_LABELS[state.type.toLowerCase()] ?? 'entity.generic'),
          });
        }

        if (user?.role === 'ADMIN' && state.status) {
          activeFilterChips.push({
            key: 'status',
            label: this.i18n.t('explorer.status'),
            value: this.statusLabel(state.status),
            advanced: true,
          });
        }

        if (user?.role === 'ADMIN' && state.contentLevel) {
          activeFilterChips.push({
            key: 'contentLevel',
            label: this.i18n.t('explorer.level'),
            value: this.contentLevelLabel(state.contentLevel),
            advanced: true,
          });
        }

        if (state.filterSupport.movement && state.movement) {
          activeFilterChips.push({
            key: 'movement',
            label: this.i18n.t('explorer.movement'),
            value: movementLabel,
          });
        }

        if (state.filterSupport.period && state.period) {
          activeFilterChips.push({
            key: 'period',
            label: this.i18n.t('explorer.period'),
            value: periodLabel,
          });
        }

        if (state.filterSupport.institution && state.institution) {
          activeFilterChips.push({
            key: 'institution',
            label: this.i18n.t('explorer.institution'),
            value: institutionLabel,
          });
        }

        if (state.filterSupport.nationality && state.nationality) {
          activeFilterChips.push({
            key: 'nationality',
            label: this.i18n.t('explorer.nationality'),
            value: nationalityLabel,
          });
        }

        if (state.tag) {
          activeFilterChips.push({
            key: 'tag',
            label: this.i18n.t('explorer.tag'),
            value: tagLabel,
          });
        }

        const selects: EntitiesListSelectFilterVm[] = [
          this.createSelectVm({
            key: 'type',
            label: this.i18n.t('explorer.type'),
            ariaLabel: this.i18n.t('explorer.filterByType'),
            optionsLabel: this.i18n.t('explorer.typeOptions'),
            allLabel: this.i18n.t('explorer.allTypes'),
            selectedValue: state.type.toLowerCase(),
            selectedLabel: state.type
              ? this.i18n.t(TYPE_ROUTE_LABELS[state.type.toLowerCase()] ?? 'entity.generic')
              : this.i18n.t('explorer.allTypes'),
            options: TYPE_FILTER_OPTIONS.map((item) => ({
              slug: item.slug,
              title: this.i18n.t(TYPE_ROUTE_LABELS[item.slug] ?? 'entity.generic'),
            })),
          }),
          {
            key: 'tag',
            label: this.i18n.t('explorer.tag'),
            ariaLabel: this.i18n.t('explorer.filterByTag'),
            optionsLabel: this.i18n.t('explorer.tagOptions'),
            allLabel: this.i18n.t('explorer.allTags'),
            selectedValue: state.tag,
            selectedLabel: state.tag ? tagLabel : this.i18n.t('explorer.allTags'),
            options: tagOptions.map((item) => ({ slug: item.slug, label: item.label })),
          },
        ];

        if (state.filterSupport.movement) {
          selects.push(
            this.createSelectVm({
              key: 'movement',
              label: this.i18n.t('explorer.movement'),
              ariaLabel: this.i18n.t('explorer.filterByMovement'),
              optionsLabel: this.i18n.t('explorer.movementOptions'),
              allLabel: this.i18n.t('explorer.allMovements'),
              selectedValue: state.movement,
              selectedLabel: state.movement ? movementLabel : this.i18n.t('explorer.allMovements'),
              options: movementOptions,
            }),
          );
        }

        if (state.filterSupport.period) {
          selects.push(
            this.createSelectVm({
              key: 'period',
              label: this.i18n.t('explorer.period'),
              ariaLabel: this.i18n.t('explorer.filterByPeriod'),
              optionsLabel: this.i18n.t('explorer.periodOptions'),
              allLabel: this.i18n.t('explorer.allPeriods'),
              selectedValue: state.period,
              selectedLabel: state.period ? periodLabel : this.i18n.t('explorer.allPeriods'),
              options: periodOptions,
            }),
          );
        }

        if (state.filterSupport.institution) {
          selects.push(
            this.createSelectVm({
              key: 'institution',
              label: this.i18n.t('explorer.institution'),
              ariaLabel: this.i18n.t('explorer.filterByInstitution'),
              optionsLabel: this.i18n.t('explorer.institutionOptions'),
              allLabel: this.i18n.t('explorer.allInstitutions'),
              selectedValue: state.institution,
              selectedLabel: state.institution
                ? institutionLabel
                : this.i18n.t('explorer.allInstitutions'),
              options: institutionOptions,
            }),
          );
        }

        if (state.filterSupport.nationality) {
          selects.push(
            this.createSelectVm({
              key: 'nationality',
              label: this.i18n.t('explorer.nationality'),
              ariaLabel: this.i18n.t('explorer.filterByNationality'),
              optionsLabel: this.i18n.t('explorer.nationalityOptions'),
              allLabel: this.i18n.t('explorer.allNationalities'),
              selectedValue: state.nationality,
              selectedLabel: state.nationality
                ? nationalityLabel
                : this.i18n.t('explorer.allNationalities'),
              options: nationalityOptions,
            }),
          );
        }

        const filterRail: EntitiesListFilterRailVm = {
          searchQuery: state.q,
          hasActiveFilters: !!(
            state.q ||
            state.type ||
            state.status ||
            state.contentLevel ||
            (state.filterSupport.movement && state.movement) ||
            (state.filterSupport.period && state.period) ||
            (state.filterSupport.institution && state.institution) ||
            (state.filterSupport.nationality && state.nationality) ||
            state.tag
          ),
          hasVisibleFilterChips: activeFilterChips.length > 0,
          hasAdvancedFilters: user?.role === 'ADMIN' && !!(state.status || state.contentLevel),
          activeFilterChips,
          selects,
          sort: state.sort,
          canSortByRelevance: !!state.q,
          status: state.status,
          contentLevel: state.contentLevel,
          resultsTotal: results.total,
          page: results.page,
          totalPages: results.totalPages,
        };

        return {
          title: state.title,
          type: state.type,
          query: state.q,
          recommendationsActive: Boolean((results as { personalized?: boolean }).personalized),
          results,
          filterRail,
        } satisfies EntitiesListPageVm;
      },
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    combineLatest([this.queryState$, this.route.queryParamMap])
      .pipe(
        map(([state, queryParamMap]) => this.obsoleteQueryParamsForType(state.type, queryParamMap)),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap((obsolete) => {
          if (!obsolete) {
            return;
          }

          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: obsolete,
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }),
      )
      .subscribe();

    this.queryState$
      .pipe(
        tap((state) => {
          const normalizedTitle = state.title || 'Entities';
          const normalizedQuery = state.q.trim();
          const pageTitle = normalizedQuery
            ? `Search ${normalizedTitle} for "${normalizedQuery}" | JANO`
            : `${normalizedTitle} | JANO`;
          const description = normalizedQuery
            ? `Browse JANO results for "${normalizedQuery}" inside ${normalizedTitle.toLowerCase()}.`
            : `Explore ${normalizedTitle.toLowerCase()} in JANO with visual browsing and editorial filters.`;
          const typeSlug = (state.type ?? '').trim().toLowerCase();
          const basePath = typeSlug ? `/entities/${typeSlug}` : '/entities';
          const params = new URLSearchParams();
          if (state.kind) params.set('kind', state.kind);
          if (normalizedQuery) params.set('q', normalizedQuery);
          const path = params.size ? `${basePath}?${params}` : basePath;

          this.seo.setPageMeta({ title: pageTitle, description, path });
        }),
      )
      .subscribe();
  }

  clearSearch(): Promise<boolean> {
    return this.navigateQuery({ q: null, page: 1, sort: null });
  }

  setQuery(value: string): Promise<boolean> {
    const nextValue = (value ?? '').trim();
    const currentSort = (this.route.snapshot.queryParamMap.get('sort') ?? '').trim();
    const keepTitle = currentSort === 'title';

    return this.navigateQuery({
      q: nextValue || null,
      page: 1,
      sort: nextValue ? (keepTitle ? 'title' : 'relevance') : null,
    });
  }

  toggleSort(next: Sort): Promise<boolean> {
    const current = this.normalizeSort(
      this.route.snapshot.queryParamMap.get('sort'),
      this.route.snapshot.queryParamMap.get('q'),
    );
    const query = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();

    if (next === 'relevance' && !query) {
      next = 'recent';
    }

    const value = next === current ? 'recent' : next;
    return this.navigateQuery({ sort: value === 'recent' ? null : value, page: 1 });
  }

  goToPreviousPage(): Promise<boolean> {
    const current = this.toPositiveInt(this.route.snapshot.queryParamMap.get('page'));
    return this.navigateQuery({ page: Math.max(1, current - 1) });
  }

  goToNextPage(totalPages: number): Promise<boolean> {
    const current = this.toPositiveInt(this.route.snapshot.queryParamMap.get('page'));
    return this.navigateQuery({ page: Math.min(totalPages, current + 1) });
  }

  toggleStatus(next: Status): Promise<boolean> {
    const current = this.normalizeStatus(this.route.snapshot.queryParamMap.get('status'));
    const value = next && next === current ? '' : next;
    return this.navigateQuery({ status: value || null, page: 1 });
  }

  toggleContentLevel(next: Level): Promise<boolean> {
    const current = this.normalizeContentLevel(
      this.route.snapshot.queryParamMap.get('contentLevel'),
    );
    const value = next && next === current ? '' : next;
    return this.navigateQuery({ contentLevel: value || null, page: 1 });
  }

  setMovement(next: string): Promise<boolean> {
    return this.navigateQuery({ movement: (next ?? '').trim() || null, page: 1 });
  }

  setType(next: string): Promise<boolean> {
    return this.router.navigate(['/entities'], {
      queryParams: { type: (next ?? '').trim().toLowerCase() || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }

  setPeriod(next: string): Promise<boolean> {
    return this.navigateQuery({ period: (next ?? '').trim() || null, page: 1 });
  }

  setInstitution(next: string): Promise<boolean> {
    return this.navigateQuery({ institution: (next ?? '').trim() || null, page: 1 });
  }

  setNationality(next: string): Promise<boolean> {
    return this.navigateQuery({ nationality: (next ?? '').trim() || null, page: 1 });
  }

  setTag(next: string): Promise<boolean> {
    return this.navigateQuery({ tag: (next ?? '').trim() || null, page: 1 });
  }

  resetFilters(): Promise<boolean> {
    return this.navigateQuery({
      q: null,
      type: null,
      status: null,
      contentLevel: null,
      movement: null,
      period: null,
      institution: null,
      nationality: null,
      tag: null,
      sort: null,
      page: 1,
    });
  }

  navigateToEntity(request: string | EntityArtworkTransitionPayload): Promise<boolean> {
    if (typeof request === 'string') {
      return this.router.navigate(['/entity', request]);
    }

    const payload = this.artworkTransition.startNavigation(request);
    return this.router.navigate(['/entity', request.slug], {
      state: { artworkTransition: payload },
    });
  }

  navigateHome(): Promise<boolean> {
    return this.router.navigate(['/']);
  }

  private navigateQuery(queryParams: Record<string, string | number | null>): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private normalizeSort(value: string | null, query: string | null): Sort {
    const normalized = (value ?? 'recent').trim();
    const sort = normalized === 'title' || normalized === 'relevance' ? normalized : 'recent';
    return sort === 'relevance' && !(query ?? '').trim() ? 'recent' : sort;
  }

  private shouldUseArchiveRecommendations(state: EntitiesListQueryState): boolean {
    return (
      !state.type &&
      state.page === 1 &&
      !state.q &&
      !state.tag &&
      !state.status &&
      !state.contentLevel &&
      !state.movement &&
      !state.period &&
      !state.institution &&
      !state.nationality &&
      state.sort === 'recent'
    );
  }

  private normalizeStatus(value: string | null): Status {
    const normalized = (value ?? '').trim();
    return normalized === 'DRAFT' || normalized === 'IN_REVIEW' || normalized === 'PUBLISHED'
      ? normalized
      : '';
  }

  private normalizeContentLevel(value: string | null): Level {
    const normalized = (value ?? '').trim();
    return normalized === 'BASIC' || normalized === 'INTERMEDIATE' || normalized === 'ADVANCED'
      ? normalized
      : '';
  }

  private toPositiveInt(value: string | null): number {
    const raw = Number(value ?? 1);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }

  private filterSupportForType(type: string | null | undefined): FilterSupport {
    return (
      FILTER_SUPPORT_BY_TYPE[(type ?? '').trim().toUpperCase()] ?? {
        movement: false,
        period: false,
        institution: false,
        nationality: false,
      }
    );
  }

  private obsoleteQueryParamsForType(
    type: string,
    queryParamMap: { get(key: string): string | null },
  ) {
    const support = this.filterSupportForType(type);
    const obsolete: Record<string, null> = {};

    if ((queryParamMap.get('deck') ?? '').trim()) {
      obsolete['deck'] = null;
    }

    for (const key of this.contextualFilterKeys) {
      const value = (queryParamMap.get(key) ?? '').trim();
      if (!value) {
        continue;
      }

      const isSupported =
        key === 'movement'
          ? support.movement
          : key === 'period'
            ? support.period
            : key === 'institution'
              ? support.institution
              : support.nationality;

      if (!isSupported) {
        obsolete[key] = null;
      }
    }

    return Object.keys(obsolete).length ? obsolete : null;
  }

  private toFilterOptions(items: Array<{ slug: string; title: string }>): FilterOption[] {
    return items.map((item) => ({ slug: item.slug, title: item.title }));
  }

  private findOptionLabel(options: FilterOption[], slug: string): string {
    return options.find((item) => item.slug === slug)?.title ?? slug;
  }

  private createSelectVm(
    config: Omit<EntitiesListSelectFilterVm, 'options'> & { options: FilterOption[] },
  ): EntitiesListSelectFilterVm {
    return {
      ...config,
      options: config.options.map((item) => ({ slug: item.slug, label: item.title })),
    };
  }

  private statusLabel(value: Status): string {
    return value ? this.i18n.t(STATUS_KEYS[value]) : '';
  }

  private contentLevelLabel(value: Level): string {
    return value ? this.i18n.t(CONTENT_LEVEL_KEYS[value]) : '';
  }
}
