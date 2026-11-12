import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { DiscoveryLayersComponent } from './discovery-layers.component';

describe('shared discovery layers', () => {
  it('cancels stale facet requests and preserves other query criteria when selecting a layer', () => {
    const params = new BehaviorSubject(
      convertToParamMap({ type: 'artwork', q: 'matisse', view: 'list' }),
    );
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params, paramMap: new BehaviorSubject(convertToParamMap({})) },
        },
        { provide: Router, useValue: { navigate } },
        { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new DiscoveryLayersComponent());
    const http = TestBed.inject(HttpTestingController);
    const subscription = component.vm$.subscribe();
    TestBed.tick();
    const first = http.expectOne((req) => req.url === '/api/discovery/facets');
    expect(JSON.parse(first.request.params.get('layers')!)).toEqual({ type: ['ARTWORK'] });
    params.next(convertToParamMap({ q: 'blue', view: 'list' }));
    expect(first.cancelled).toBe(true);
    const current = http.expectOne((req) => req.params.get('q') === 'blue');
    params.next(convertToParamMap({ q: 'blue', view: 'list', mode: 'color' }));
    expect(current.cancelled).toBe(false);
    current.flush({ total: 0, facets: [{ key: 'type', options: [] }] });
    component.toggle('color', 'blue', { type: ['ARTWORK'] });
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({
          page: 1,
          type: null,
          layers: JSON.stringify({ type: ['ARTWORK'], color: ['blue'] }),
        }),
      }),
    );
    subscription.unsubscribe();
    http.verify();
  });
});
