import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SearchComponent } from './search.component';
import { SearchApi, SearchResponse } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';

describe('search states', () => {
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
    params.next(convertToParamMap({ q: 'Guernica' }));
    expect(requests[0].observed).toBe(false);
    expect(states.at(-1)).toMatchObject({ loading: true, query: 'Guernica' });
    requests[1].error(new Error('offline'));
    expect(states.at(-1)).toMatchObject({ loading: false, error: true });
    component.retry$.next();
    expect(states.at(-1)).toMatchObject({ loading: true, error: false });
    requests[2].next({ query: 'Guernica', total: 0, items: [], groups: {}, sections: [] });
    expect(states.at(-1)).toMatchObject({ loading: false, error: false, query: 'Guernica' });
    subscription.unsubscribe();
  });
});
