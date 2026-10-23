import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SearchApi, SearchResponse } from '../../../core/api/search.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { entitySymbol } from '../../entity-symbols';
import { GlobalSearchComponent } from './global-search.component';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextSuggestionIndex } from './global-search.component';

describe('global search navigation', () => {
  it('wraps keyboard selection and handles an empty result list', () => {
    expect(nextSuggestionIndex(0, -1, 3)).toBe(2);
    expect(nextSuggestionIndex(2, 1, 3)).toBe(0);
    expect(nextSuggestionIndex(0, 1, 0)).toBe(-1);
  });
});

describe('search suggestions loading', () => {
  it('shows waiting immediately and cancels the previous request before debounce', () => {
    vi.useFakeTimers();
    try {
      const requests: Subject<SearchResponse>[] = [];
      const search = vi.fn(() => {
        const request = new Subject<SearchResponse>();
        requests.push(request);
        return request;
      });
      TestBed.configureTestingModule({
        imports: [GlobalSearchComponent],
        providers: [
          { provide: Router, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SearchApi, useValue: { search } },
          { provide: I18nService, useValue: { locale: () => 'es', t: (key: string) => key } },
        ],
      });
      const fixture = TestBed.createComponent(GlobalSearchComponent);
      const component = fixture.componentInstance;
      component.onSearchFocus('');
      fixture.detectChanges();
      const paths = fixture.nativeElement.querySelectorAll(
        '.app-chrome__search-category-icon path',
      );
      expect(paths.length).toBe(7);
      expect(paths[0].getAttribute('d')).toBe(entitySymbol('ARTIST').path);
      expect(paths[1].getAttribute('d')).toBe(entitySymbol('MOVEMENT').path);
      component.onSearchInput('Picasso');
      expect(component.searchLoading()).toBe(true);
      expect(search).not.toHaveBeenCalled();
      vi.advanceTimersByTime(180);
      expect(requests[0].observed).toBe(true);
      component.onSearchInput('Guernica');
      expect(requests[0].observed).toBe(false);
      expect(component.searchLoading()).toBe(true);
      vi.advanceTimersByTime(180);
      requests[1].error(new Error('offline'));
      expect(component.searchLoading()).toBe(false);
      expect(component.searchError()).toBe(true);
      component.onSearchInput('');
      expect(component.searchLoading()).toBe(false);
      expect(component.searchError()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('recent searches and prompts across layouts', () => {
  afterEach(() => vi.unstubAllGlobals());
  function setup() {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SearchApi, useValue: { search: () => new Subject<SearchResponse>() } },
        {
          provide: I18nService,
          useValue: {
            locale: () => 'es',
            t: (key: string) => (key === 'search.promptQuery' ? 'color en Goya' : key),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(GlobalSearchComponent);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      navigate,
      input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
    };
  }

  it('exposes the same working history and prompt in mobile and desktop, and persists without duplicates', () => {
    const { fixture, component, navigate, input } = setup();
    component.chooseRecentSearch(input, ' Picasso ');
    component.chooseRecentSearch(input, 'picasso');
    expect(component.recentSearches()).toEqual(['picasso']);
    component.onSearchFocus('');
    fixture.detectChanges();
    for (const selector of [
      '.app-chrome__mobile-search-prelude',
      '.app-chrome__search-prelude--desktop',
    ]) {
      const panel = fixture.nativeElement.querySelector(selector);
      expect(panel.querySelector('.app-chrome__search-recents').textContent).toContain('picasso');
      panel.querySelector('.app-chrome__search-prompt').click();
      expect(navigate).toHaveBeenLastCalledWith(['/search'], {
        queryParams: { q: 'color en Goya', type: null },
      });
      component.onSearchFocus('');
      fixture.detectChanges();
    }
    expect(JSON.parse(window.localStorage.getItem('jano.search.recents')!)).toEqual([
      'color en Goya',
      'picasso',
    ]);
    const restored = TestBed.createComponent(GlobalSearchComponent).componentInstance;
    expect(restored.recentSearches()).toEqual(['color en Goya', 'picasso']);
    expect(component.recentSearches().length).toBe(2);
    fixture.nativeElement.querySelector('.app-chrome__search-recent').click();
    expect(component.searchFocused()).toBe(false);
    expect(document.documentElement.classList.contains('app-search-open')).toBe(false);
  });

  it('saves selected autocomplete results and activates arrow selection with Enter', () => {
    const { component, input, navigate } = setup();
    component.searchSuggestions.set([{ title: 'Pablo Picasso' }, { title: 'Guernica' }] as never);
    const plainEnter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    component.onSearchKeydown(plainEnter, input);
    expect(plainEnter.defaultPrevented).toBe(false);
    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }), input);
    expect(component.activeSuggestionIndex()).toBe(1);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    component.onSearchKeydown(enter, input);
    expect(enter.defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenLastCalledWith(['/search'], {
      queryParams: { q: 'Guernica', type: null },
    });
    expect(component.recentSearches()).toEqual(['Guernica']);
  });

  it('keeps navigation working when persistent storage is blocked', () => {
    const { component, input, navigate } = setup();
    const storage = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      component.chooseRecentSearch(input, 'Goya');
      expect(component.recentSearches()).toEqual(['Goya']);
      expect(navigate).toHaveBeenCalled();
    } finally {
      storage.mockRestore();
    }
  });
});
