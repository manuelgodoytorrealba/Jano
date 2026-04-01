import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { EntitiesListComponent } from './entities-list.component';

describe('EntitiesListComponent filters', () => {
  const paramMap$ = new BehaviorSubject(convertToParamMap({ type: 'artwork' }));
  const queryParamMap$ = new BehaviorSubject(
    convertToParamMap({
      movement: 'surrealismo',
      period: 'siglo-xx',
      status: 'PUBLISHED',
      contentLevel: 'INTERMEDIATE',
    }),
  );

  let navigateCalls: any[] = [];
  let listCalls: any[] = [];

  const routeStub = {
    paramMap: paramMap$.asObservable(),
    queryParamMap: queryParamMap$.asObservable(),
    snapshot: {
      queryParamMap: convertToParamMap({
        movement: 'surrealismo',
        period: 'siglo-xx',
        status: 'PUBLISHED',
        contentLevel: 'INTERMEDIATE',
      }),
    },
  };

  const apiStub = {
    list: (params: any) => {
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

      return of({
        items: [],
        page: params?.page ?? 1,
        limit: params?.limit ?? 24,
        total: 0,
        totalPages: 1,
      });
    },
  };

  const routerStub = {
    navigate: (...args: any[]) => {
      navigateCalls.push(args);
      return Promise.resolve(true);
    },
  };

  beforeEach(async () => {
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
    let latest: any = null;

    component.vm$.subscribe((value) => {
      latest = value;
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(latest).toBeTruthy();
    expect(listCalls.some((params) =>
      params?.type === 'ARTWORK' &&
      params?.movement === 'surrealismo' &&
      params?.period === 'siglo-xx' &&
      params?.status === 'PUBLISHED' &&
      params?.contentLevel === 'INTERMEDIATE',
    )).toBe(true);
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
      sort: null,
      page: 1,
    });
  });
});
