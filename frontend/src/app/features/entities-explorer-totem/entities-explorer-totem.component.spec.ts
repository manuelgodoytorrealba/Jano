import { ElementRef, SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntitiesExplorerTotemComponent } from './entities-explorer-totem.component';
import { TotemMotion } from './totem-motion';

const items = (start: number, count = 24) =>
  Array.from({ length: count }, (_, index) => ({
    slug: `entity-${start + index}`,
    title: `Entity ${start + index}`,
    type: 'ARTWORK',
  })) as EntitiesExplorerTotemComponent['items'];

describe('totem gestures', () => {
  let component: EntitiesExplorerTotemComponent;
  let now: number;
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let stage: HTMLDivElement;
  const state = () => (component as unknown as { motion: TotemMotion }).motion;
  const pointer = (y: number) =>
    ({
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientY: y,
      target: stage,
      preventDefault: vi.fn(),
    }) as unknown as PointerEvent;
  const tick = (milliseconds = 16) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(now));
  };

  beforeEach(() => {
    now = 1000;
    frameId = 0;
    frames = new Map();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    component = TestBed.runInInjectionContext(() => new EntitiesExplorerTotemComponent({}));
    stage = document.createElement('div');
    stage.setPointerCapture = vi.fn();
    stage.hasPointerCapture = () => false;
    component.stageRef = new ElementRef(stage);
    component.items = items(0);
    component.ngOnChanges({ items: new SimpleChange(undefined, component.items, true) });
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('allows several cards to pass under a continuously held finger, then reverse', () => {
    component.onPointerDown(pointer(1500));
    now += 300;
    component.onPointerMove(pointer(400));
    expect(state().position).toBeGreaterThan(3);
    expect(component.activeItem?.slug).toBe('entity-3');
    now += 100;
    component.onPointerMove(pointer(1200));
    expect(state().position).toBeLessThan(1);
    expect(component.activeItem?.slug).toBe('entity-1');
  });

  it('does not skip the next entity after a short fast swipe', () => {
    component.onPointerDown(pointer(500));
    now += 30;
    component.onPointerMove(pointer(350));
    component.onPointerUp(pointer(350));
    for (let frame = 0; frame < 180; frame++) tick();
    expect(state().position).toBe(1);
    expect(component.activeItem?.slug).toBe('entity-1');
  });

  it('catches a moving card at its exact position and does not open it', () => {
    const open = vi.spyOn(component.openEntity, 'emit');
    component.onPointerDown(pointer(500));
    now += 30;
    component.onPointerMove(pointer(350));
    component.onPointerUp(pointer(350));
    tick();
    expect(component.isSettling).toBe(true);
    const caught = state().position;
    component.onPointerDown(pointer(350));
    expect(state().position).toBe(caught);
    tick(100);
    expect(state().position).toBe(caught);
    component.onPointerUp(pointer(350));
    expect(open).not.toHaveBeenCalled();
    for (let frame = 0; frame < 100; frame++) tick();
    expect(Number.isInteger(state().position)).toBe(true);
  });

  it('does not treat a drag out and back as a tap', () => {
    const open = vi.spyOn(component.openEntity, 'emit');
    component.onPointerDown(pointer(500));
    now += 30;
    component.onPointerMove(pointer(350));
    now += 30;
    component.onPointerMove(pointer(500));
    component.onPointerUp(pointer(500));
    expect(open).not.toHaveBeenCalled();
    const click = new MouseEvent('click', { detail: 1, cancelable: true });
    component.onLinkClick(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it('preserves the held position and velocity across a page handoff', () => {
    const page = vi.spyOn(component.pageChange, 'emit');
    component.hasNextPage = true;
    component.nextItems = items(24, 2);
    component.onPointerDown(pointer(1000));
    now += 300;
    component.onPointerMove(pointer(-6600));
    expect(page).toHaveBeenCalledExactlyOnceWith(1);
    const before = { ...state() };
    const old = component.items;
    component.items = items(24);
    component.activeIndex = 0;
    component.ngOnChanges({ items: new SimpleChange(old, component.items, false) });
    expect(state().position).toBeCloseTo(before.position - 24);
    expect(state().velocity).toBe(before.velocity);
    expect(component.activeItem?.slug).toBe('entity-24');
    now += 50;
    component.onPointerMove(pointer(-6650));
    expect(state().position).toBeGreaterThan(before.position - 24);
  });

  it('respects reduced motion and stops at the real beginning of the catalog', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(state().position).toBe(0);
    expect(component.isSettling).toBe(false);
    expect(state().velocity).toBe(0);
  });

  it('stops a fast outward flick at the real edge without losing the active card', () => {
    component.onPointerDown(pointer(300));
    now += 30;
    component.onPointerMove(pointer(500));
    component.onPointerUp(pointer(500));
    for (let frame = 0; frame < 150; frame++) {
      tick();
      expect(component.activeItem).not.toBeNull();
    }
    expect(state().position).toBe(0);
    expect(state().velocity).toBe(0);
    expect(component.isSettling).toBe(false);
  });

  it('releases a cancelled gesture and finishes on a card', () => {
    component.onPointerDown(pointer(500));
    now += 100;
    component.onPointerMove(pointer(290));
    component.onPointerCancel(pointer(290));
    expect(component.isDragging).toBe(false);
    for (let frame = 0; frame < 100; frame++) tick();
    expect(Number.isInteger(state().position)).toBe(true);
    expect(state().velocity).toBe(0);
  });
});
