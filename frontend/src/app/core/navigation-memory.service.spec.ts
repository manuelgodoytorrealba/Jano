import { DestroyRef, PLATFORM_ID, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationMemoryService } from './navigation-memory.service';

describe('navigation visit memory', () => {
  let events: Subject<unknown>;
  let memory: NavigationMemoryService;
  const state = window.history.state;
  const originalUrl = window.location.href;
  const router = { events: new Subject<unknown>(), getCurrentNavigation: () => null };
  const navigate = (id: number, url: string, restored?: Record<string, unknown>) => {
    events.next(
      new NavigationStart(id, url, restored ? 'popstate' : 'imperative', restored as never),
    );
    events.next(new NavigationEnd(id, url, url));
    return window.history.state.janoVisit;
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    events = new Subject();
    router.events = events;
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    memory = TestBed.inject(NavigationMemoryService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.sessionStorage.clear();
    window.history.replaceState(state, '', originalUrl);
    vi.restoreAllMocks();
  });

  it('restores independent visits and carries the original exploration through relations', () => {
    const archive = navigate(1, '/entities/artist?page=3');
    let captured = { slug: 'marcel-duchamp', mode: 'list', scroll: 400 };
    TestBed.runInInjectionContext(() =>
      memory.register('view', () => captured, inject(DestroyRef)),
    );
    const entity = navigate(2, '/entity/marcel-duchamp');
    expect(memory.origin?.key).toBe(archive.key);
    captured = { slug: 'fountain', mode: 'detail', scroll: 100 };
    const relation = navigate(3, '/entity/fountain');
    expect(memory.origin?.key).toBe(archive.key);
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
    memory.returnToOrigin();
    expect(go).toHaveBeenCalledWith(-2);
    navigate(4, '/entity/marcel-duchamp', { janoVisit: entity });
    expect(memory.read('view')).toEqual({ slug: 'fountain', mode: 'detail', scroll: 100 });
    navigate(5, '/entities/artist?page=3', { janoVisit: archive });
    expect(memory.read('view')).toEqual({ slug: 'marcel-duchamp', mode: 'list', scroll: 400 });
    expect(memory.origin).toBeNull();
    navigate(6, '/entity/fountain', { janoVisit: relation });
    expect(memory.origin?.key).toBe(archive.key);
  });

  it('does not invent an origin for direct links or cancelled navigation', () => {
    const direct = navigate(1, '/entity/man-ray');
    expect(memory.origin).toBeNull();
    events.next(new NavigationStart(2, '/entities'));
    events.next(new NavigationCancel(2, '/entities', 'test cancellation'));
    expect(memory.visit().key).toBe(direct.key);
    navigate(3, '/entities');
    navigate(4, '/entity/man-ray', { janoVisit: direct });
    expect(memory.visit().origin).toBeNull();
  });

  it('restores a visit after reload without adding another history position', () => {
    const visit = navigate(1, '/entities?page=2');
    memory.write('view', { slug: 'saved' });
    events.next(new NavigationStart(2, '/entity/saved'));
    // Restore the original native history entry before constructing the next app instance.
    window.history.replaceState({ janoVisit: visit }, '', '/entities?page=2');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    memory = TestBed.inject(NavigationMemoryService);
    navigate(3, '/entities?page=2');
    expect(memory.visit().key).toBe(visit.key);
    expect(memory.visit().position).toBe(visit.position);
    expect(memory.read('view')).toEqual({ slug: 'saved' });
  });

  it('does not access browser storage during SSR', () => {
    TestBed.resetTestingModule();
    const storage = vi.spyOn(window.sessionStorage, 'getItem');
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    memory = TestBed.inject(NavigationMemoryService);
    expect(memory.read('view')).toBeNull();
    expect(storage).not.toHaveBeenCalled();
  });

  it('bounds storage while pinning the active exploration origin', () => {
    const origin = navigate(1, '/entities');
    for (let id = 2; id < 42; id++) navigate(id, `/entity/item-${id}`);
    const stored = JSON.parse(window.sessionStorage.getItem('jano-navigation-v1') ?? '[]');
    expect(stored).toHaveLength(32);
    expect(stored.some((visit: { key: string }) => visit.key === origin.key)).toBe(true);
    expect(memory.origin?.key).toBe(origin.key);
  });

  it('keeps working when session storage rejects writes', () => {
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const archive = navigate(1, '/entities');
    memory.write('view', { slug: 'saved' });
    navigate(2, '/entity/saved');
    navigate(3, '/entities', { janoVisit: archive });
    expect(memory.read('view')).toEqual({ slug: 'saved' });
  });

  it('keeps full detail responses in memory without persisting their bodies', () => {
    const detail = navigate(1, '/entity/one');
    memory.writeTransient('entity-data', { body: 'temporary article body' });
    navigate(2, '/entity/two');
    navigate(3, '/entity/one', { janoVisit: detail });
    expect(memory.read('entity-data')).toEqual({ body: 'temporary article body' });
    expect(window.sessionStorage.getItem('jano-navigation-v1')).not.toContain(
      'temporary article body',
    );
  });
});
