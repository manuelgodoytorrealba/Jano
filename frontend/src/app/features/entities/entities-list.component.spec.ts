import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, map, of } from 'rxjs';
import { EntitiesApi, EntitiesListParams } from '../../core/api/entities.api';
import { EntitiesListComponent } from './entities-list.component';
import { EntitiesListPageVm } from './entities-list.facade';

describe('EntitiesListComponent filters', () => {
  const paramMap$ = new BehaviorSubject(convertToParamMap({ type: 'artwork' }));
  const queryParamMap$ = new BehaviorSubject(
    convertToParamMap({
      movement: 'surrealismo',
      period: 'siglo-xx',
      institution: 'Museo del Prado, Madrid',
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
    }),
  );

  let navigateCalls: Parameters<Router['navigate']>[] = [];
  let listCalls: EntitiesListParams[] = [];

  const routeStub = {
    paramMap: paramMap$.asObservable(),
    queryParamMap: queryParamMap$.asObservable(),
    snapshot: {
      get queryParamMap() {
        return queryParamMap$.value;
      },
    },
  };

  const apiStub = {
    list: (params: EntitiesListParams) => {
      listCalls.push(params);

      if (params?.type === 'MOVEMENT') {
        return of({
          items: [{ slug: 'surrealismo', title: 'Surrealismo' }],
          page: 1,
          limit: 60,
          total: 1,
          totalPages: 1,
        });
      }

      if (params?.type === 'PERIOD') {
        return of({
          items: [{ slug: 'siglo-xx', title: 'Siglo XX' }],
          page: 1,
          limit: 60,
          total: 1,
          totalPages: 1,
        });
      }

      const items =
        params?.movement === 'cubismo'
          ? [{ slug: 'guernica' }]
          : [{ slug: 'persistencia-1' }, { slug: 'persistencia-2' }, { slug: 'persistencia-3' }];

      return of({
        items,
        page: params?.page ?? 1,
        limit: params?.limit ?? 24,
        total: items.length,
        totalPages: 1,
      });
    },
    institutions: () => of(['Museo del Prado, Madrid', 'MoMA, New York']),
    nationalities: () => of(['España', 'México', 'Francia / Estados Unidos']),
  };

  const routerStub = {
    navigate: (...args: Parameters<Router['navigate']>) => {
      navigateCalls.push(args);
      return Promise.resolve(true);
    },
  };

  beforeEach(async () => {
    paramMap$.next(convertToParamMap({ type: 'artwork' }));
    queryParamMap$.next(
      convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'Museo del Prado, Madrid',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    navigateCalls = [];
    listCalls = [];

    await TestBed.configureTestingModule({
      imports: [EntitiesListComponent],
      providers: [
        { provide: EntitiesApi, useValue: apiStub },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: Router, useValue: routerStub },
      ],
    })
      .overrideComponent(EntitiesListComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('reads movement and period from query params when loading the catalog vm', async () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;
    let latest: EntitiesListPageVm | null = null;

    component.pageVm$.subscribe((value) => {
      latest = value;
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(latest).toBeTruthy();
    expect(
      listCalls.some(
        (params) =>
          params?.type === 'ARTWORK' &&
          params?.movement === 'surrealismo' &&
          params?.period === 'siglo-xx' &&
          params?.institution === 'Museo del Prado, Madrid' &&
          params?.nationality === undefined &&
          params?.status === 'PUBLISHED' &&
          params?.contentLevel === 'INTERMEDIATE',
      ),
    ).toBe(true);
  });

  it('reacts to query param changes and reissues the catalog request with the new movement slug', async () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;
    const emitted: EntitiesListPageVm[] = [];

    component.pageVm$.subscribe((value) => {
      emitted.push(value);
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    queryParamMap$.next(
      convertToParamMap({
        movement: 'cubismo',
        period: 'siglo-xx',
        institution: 'MoMA, New York',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(emitted.at(-1)?.results.items).toEqual([{ slug: 'guernica' }]);
    expect(
      listCalls.some((params) => params?.type === 'ARTWORK' && params?.movement === 'cubismo'),
    ).toBe(true);
    expect(
      listCalls.some(
        (params) => params?.type === 'ARTWORK' && params?.institution === 'MoMA, New York',
      ),
    ).toBe(true);
  });

  it('keeps institution combined with q and title sort for artwork catalogs', async () => {
    queryParamMap$.next(
      convertToParamMap({
        q: 'maman',
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'MoMA, New York',
        sort: 'title',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'ARTWORK' &&
          params?.q === 'maman' &&
          params?.sort === 'title' &&
          params?.movement === 'surrealismo' &&
          params?.period === 'siglo-xx' &&
          params?.institution === 'MoMA, New York',
      ),
    ).toBe(true);
  });

  it('re-centers the active explorer index when a new result set arrives', async () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(component.activeIndex()).toBe(1);

    component.activeIndex.set(2);

    queryParamMap$.next(
      convertToParamMap({
        movement: 'cubismo',
        period: 'siglo-xx',
        institution: 'MoMA, New York',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(component.activeIndex()).toBe(0);
  });

  it('resetFilters clears movement and period along with the existing filter params', () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.resetFilters();

    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][1]?.queryParams).toEqual({
      q: null,
      status: null,
      contentLevel: null,
      movement: null,
      period: null,
      institution: null,
      nationality: null,
      sort: null,
      page: 1,
    });
  });

  it('exposes readable labels for active status and content level filters', () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    expect(component.statusLabel('IN_REVIEW')).toBe('In review');
    expect(component.contentLevelLabel('ADVANCED')).toBe('Advanced');
  });

  it('setInstitution resets pagination and merges the institution query param', () => {
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.setInstitution('MoMA, New York');

    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][1]?.queryParams).toEqual({
      institution: 'MoMA, New York',
      page: 1,
    });
  });

  it('treats institution as an active visible filter only for artwork catalogs', async () => {
    queryParamMap$.next(
      convertToParamMap({
        institution: 'Museo del Prado, Madrid',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;
    const visibleStates: boolean[] = [];

    component.pageVm$
      .pipe(map((value) => value.filterRail.hasVisibleFilterChips))
      .subscribe((value) => {
        visibleStates.push(value);
      });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(visibleStates.at(-1)).toBe(true);

    paramMap$.next(convertToParamMap({ type: 'movement' }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(visibleStates.at(-1)).toBe(false);
  });

  it('keeps nationality combined with q, sort, movement and period for artist catalogs', async () => {
    paramMap$.next(convertToParamMap({ type: 'artist' }));
    queryParamMap$.next(
      convertToParamMap({
        q: 'louise',
        nationality: 'Francia / Estados Unidos',
        movement: 'arte-contemporaneo',
        period: 'siglo-xx',
        sort: 'title',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'ARTIST' &&
          params?.q === 'louise' &&
          params?.sort === 'title' &&
          params?.movement === 'arte-contemporaneo' &&
          params?.period === 'siglo-xx' &&
          params?.nationality === 'Francia / Estados Unidos' &&
          params?.institution === undefined,
      ),
    ).toBe(true);
  });

  it('setNationality resets pagination and merges the nationality query param', () => {
    paramMap$.next(convertToParamMap({ type: 'artist' }));
    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    navigateCalls = [];
    component.setNationality('México');

    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][1]?.queryParams).toEqual({
      nationality: 'México',
      page: 1,
    });
  });

  it('treats nationality as an active visible filter only for artist catalogs', async () => {
    paramMap$.next(convertToParamMap({ type: 'artist' }));
    queryParamMap$.next(
      convertToParamMap({
        nationality: 'España',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;
    const visibleStates: boolean[] = [];

    component.pageVm$
      .pipe(map((value) => value.filterRail.hasVisibleFilterChips))
      .subscribe((value) => {
        visibleStates.push(value);
      });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(visibleStates.at(-1)).toBe(true);

    paramMap$.next(convertToParamMap({ type: 'artwork' }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(visibleStates.at(-1)).toBe(false);
  });

  it('ignores institution when the catalog type is not artwork', async () => {
    paramMap$.next(convertToParamMap({ type: 'artist' }));
    queryParamMap$.next(
      convertToParamMap({
        institution: 'Museo del Prado, Madrid',
        movement: 'surrealismo',
        period: 'siglo-xx',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'ARTIST' &&
          params?.movement === 'surrealismo' &&
          params?.period === 'siglo-xx' &&
          params?.institution === undefined,
      ),
    ).toBe(true);
  });

  it('cleans obsolete institution when switching from artwork to artist', async () => {
    queryParamMap$.next(
      convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'Museo del Prado, Madrid',
        status: 'PUBLISHED',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    fixture.componentInstance.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 50));

    navigateCalls = [];
    paramMap$.next(convertToParamMap({ type: 'artist' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][1]).toEqual(
      expect.objectContaining({
        queryParams: {
          institution: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('cleans all contextual params when switching to movement', async () => {
    queryParamMap$.next(
      convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'Museo del Prado, Madrid',
        nationality: 'España',
        status: 'PUBLISHED',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    fixture.componentInstance.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 50));

    navigateCalls = [];
    paramMap$.next(convertToParamMap({ type: 'movement' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][1]).toEqual(
      expect.objectContaining({
        queryParams: {
          movement: null,
          period: null,
          institution: null,
          nationality: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('keeps movement and period active for artist catalogs', async () => {
    paramMap$.next(convertToParamMap({ type: 'artist' }));
    queryParamMap$.next(
      convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'Museo del Prado, Madrid',
        nationality: 'España',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'ARTIST' &&
          params?.movement === 'surrealismo' &&
          params?.period === 'siglo-xx' &&
          params?.nationality === 'España' &&
          params?.institution === undefined,
      ),
    ).toBe(true);
  });

  it('ignores movement, period and institution for concept catalogs', async () => {
    paramMap$.next(convertToParamMap({ type: 'concept' }));
    queryParamMap$.next(
      convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        institution: 'Museo del Prado, Madrid',
        nationality: 'España',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    );

    const fixture = TestBed.createComponent(EntitiesListComponent);
    const component = fixture.componentInstance;

    component.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'CONCEPT' &&
          params?.movement === undefined &&
          params?.period === undefined &&
          params?.institution === undefined &&
          params?.nationality === undefined &&
          params?.status === 'PUBLISHED' &&
          params?.contentLevel === 'INTERMEDIATE',
      ),
    ).toBe(true);
  });

  it('ignores institution and nationality for movement and period catalogs', async () => {
    paramMap$.next(convertToParamMap({ type: 'movement' }));
    queryParamMap$.next(
      convertToParamMap({
        institution: 'Museo del Prado, Madrid',
        nationality: 'España',
        status: 'PUBLISHED',
      }),
    );

    const movementFixture = TestBed.createComponent(EntitiesListComponent);
    movementFixture.componentInstance.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'MOVEMENT' &&
          params?.institution === undefined &&
          params?.nationality === undefined &&
          params?.status === 'PUBLISHED',
      ),
    ).toBe(true);

    listCalls = [];
    paramMap$.next(convertToParamMap({ type: 'period' }));

    const periodFixture = TestBed.createComponent(EntitiesListComponent);
    periodFixture.componentInstance.pageVm$.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(
      listCalls.some(
        (params) =>
          params?.type === 'PERIOD' &&
          params?.institution === undefined &&
          params?.nationality === undefined &&
          params?.status === 'PUBLISHED',
      ),
    ).toBe(true);
  });
});
