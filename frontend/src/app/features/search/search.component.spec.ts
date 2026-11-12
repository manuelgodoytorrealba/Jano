import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SearchComponent } from './search.component';
import { SearchApi, SearchResponse, SearchResult } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('search states', () => {
  it('returns home only after the last criterion is cleared, retaining modal state and history', () => {
    const params = new BehaviorSubject(convertToParamMap({ q: 'Dante' }));
    const navigate = vi.fn().mockResolvedValue(true);
    const search = vi.fn(() => new Subject<SearchResponse>());
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params, snapshot: { queryParamMap: params.value } },
        },
        { provide: Router, useValue: { navigate } },
        { provide: SearchApi, useValue: { search } },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new SearchComponent());
    const subscription = component.vm$.subscribe();
    TestBed.tick();
    for (const criteria of [
      { image: 'private-image' },
      { colors: '#254E77' },
      { layers: '{"type":["ARTWORK"]}' },
    ]) {
      params.next(convertToParamMap(criteria));
      expect(navigate).not.toHaveBeenCalled();
    }
    expect(search).toHaveBeenCalledTimes(4);
    params.next(convertToParamMap({ layers: '{"type":[],"color":[" "]}', page: '1' }));
    expect(navigate).toHaveBeenLastCalledWith(['/home'], { replaceUrl: true });
    expect(search).toHaveBeenCalledTimes(4);
    params.next(convertToParamMap({ q: '  ', mode: 'image' }));
    expect(navigate).toHaveBeenLastCalledWith(['/home'], {
      replaceUrl: true,
      queryParams: { mode: 'image' },
    });
    params.next(convertToParamMap({ mode: 'color' }));
    expect(navigate).toHaveBeenLastCalledWith(['/home'], {
      replaceUrl: true,
      queryParams: { mode: 'color' },
    });
    navigate.mockClear();
    params.next(convertToParamMap({ q: 'no matches' }));
    search.mock.results
      .at(-1)!
      .value.next({ query: 'no matches', total: 0, items: [], groups: {}, sections: [] });
    expect(navigate).not.toHaveBeenCalled();
    expect(component.hasCriteria(convertToParamMap({ layers: '{}' }))).toBe(false);
    for (const filter of [{ type: 'ARTWORK' }, { kind: 'WORK' }, { tag: 'blue' }])
      expect(component.hasCriteria(convertToParamMap(filter))).toBe(true);
    expect(component.hasCriteria(convertToParamMap({ layers: 'invalid-json' }))).toBe(true);
    subscription.unsubscribe();
  });

  it('loads immediately, cancels stale queries, and recovers after retry', () => {
    const params = new BehaviorSubject(convertToParamMap({ q: 'Picasso' }));
    const requests: Subject<SearchResponse>[] = [];
    const search = vi.fn(() => {
      const request = new Subject<SearchResponse>();
      requests.push(request);
      return request;
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params, snapshot: { queryParamMap: params.value } },
        },
        { provide: Router, useValue: {} },
        { provide: SearchApi, useValue: { search } },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new SearchComponent());
    const states: Array<{ loading: boolean; error: boolean; query: string }> = [];
    const subscription = component.vm$.subscribe((state) => states.push(state));
    TestBed.tick();
    expect(states.at(-1)).toMatchObject({ loading: true, query: 'Picasso' });
    params.next(convertToParamMap({ q: 'Picasso', mode: 'image' }));
    expect(requests).toHaveLength(1);
    params.next(convertToParamMap({ q: 'Guernica' }));
    expect(requests[0].observed).toBe(false);
    expect(states.at(-1)).toMatchObject({ loading: true, query: 'Guernica' });
    requests[1].error(new Error('offline'));
    expect(states.at(-1)).toMatchObject({ loading: false, error: true });
    component.retry$.next();
    expect(states.at(-1)).toMatchObject({ loading: true, error: false });
    requests[2].next({ query: 'Guernica', total: 0, items: [], groups: {}, sections: [] });
    expect(states.at(-1)).toMatchObject({ loading: false, error: false, query: 'Guernica' });

    const item = (id: string, resultType: SearchResult['resultType']) =>
      ({
        id,
        resultType,
        type: 'ARTWORK',
        title: id,
        matchedFields: [],
      }) as unknown as SearchResult;
    const main = item('principal', 'ENTITY');
    const entities = [
      main,
      { ...item('concept', 'ENTITY'), type: 'CONCEPT' },
      item('near-1', 'ENTITY'),
      item('near-2', 'ENTITY'),
      item('near-3', 'ENTITY'),
    ];
    const research = item('research', 'RESEARCH');
    const relation = item('relation', 'RELATION');
    const vm = {
      query: 'Guernica',
      total: 7,
      items: entities,
      groups: {},
      loading: false,
      error: false,
      sections: [
        { key: 'entities', title: 'Entidades', total: 5, items: entities },
        { key: 'research', title: 'Investigaciones', total: 1, items: [research] },
        { key: 'connections', title: 'Conexiones', total: 1, items: [relation] },
      ],
    };
    component.setFilter('ALL');
    expect(component.filterLabel('ALL')).toBe('search.best');
    expect(component.sections(vm).map((section) => section.key)).toEqual([
      'entities',
      'connections',
    ]);
    expect(component.visibleItems(vm.sections[0], vm).map((item) => item.id)).toEqual([
      'near-1',
      'near-2',
    ]);
    component.setFilter('ENTITY');
    expect(component.sections(vm).map((section) => section.key)).toEqual(['entities']);
    expect(component.visibleItems(vm.sections[0], vm)).toEqual(entities);
    component.setFilter('RESEARCH');
    expect(component.sections(vm).map((section) => section.key)).toEqual(['research']);
    component.setFilter('RELATION');
    expect(component.sections(vm).map((section) => section.key)).toEqual(['connections']);
    component.setFilter('ENTITY');
    params.next(convertToParamMap({ q: 'Guernica', page: '2' }));
    expect(component.activeFilter()).toBe('ENTITY');
    params.next(convertToParamMap({ q: 'Dante' }));
    expect(component.activeFilter()).toBe('ALL');
    requests.at(-1)!.next({
      query: 'Dante',
      total: 1,
      items: [relation],
      groups: {},
      sections: [vm.sections[2]],
    });
    expect(component.activeFilter()).toBe('RELATION');
    requests.at(-1)!.next({
      query: 'Dante',
      total: 1,
      items: [research],
      groups: {},
      sections: [vm.sections[1]],
    });
    expect(component.activeFilter()).toBe('ALL');
    subscription.unsubscribe();
  });
});
