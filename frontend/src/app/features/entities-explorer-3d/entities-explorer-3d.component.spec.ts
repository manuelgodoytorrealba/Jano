import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntitiesExplorer3dComponent } from './entities-explorer-3d.component';

describe('explorer page boundaries', () => {
  it('leaves modified native link clicks to the browser and suppresses clicks after dragging', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const component = TestBed.runInInjectionContext(() => new EntitiesExplorer3dComponent({}));
    expect(component.entityHref({ slug: 'work', type: 'ARTWORK' } as never)).toBe('/entity/work');
    expect(component.entityHref({ slug: 'publication', type: 'RESEARCH' } as never)).toBe(
      '/research/publication',
    );
    const open = vi.spyOn(component, 'openActive').mockImplementation(() => undefined);
    for (const options of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { button: 1 },
    ]) {
      const event = new MouseEvent('click', { cancelable: true, ...options });
      component.onEntityLinkClick(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(open).not.toHaveBeenCalled();
    (component as unknown as { dragMoved: boolean }).dragMoved = true;
    const dragged = new MouseEvent('click', { cancelable: true });
    component.onEntityLinkClick(dragged);
    expect(dragged.defaultPrevented).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });
  it('requests the next page instead of wrapping to the first card', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const component = TestBed.runInInjectionContext(() => new EntitiesExplorer3dComponent({}));
    component.items = [{ slug: 'first' }, { slug: 'last' }] as typeof component.items;
    component.activeIndex = 1;
    component.hasNextPage = true;
    const pages: number[] = [];
    const indices: number[] = [];
    component.pageChange.subscribe((page) => pages.push(page));
    component.activeIndexChange.subscribe((index) => indices.push(index));
    const navigate = (index: number) =>
      (component as unknown as { goToIndex(index: number): void }).goToIndex(index);
    navigate(2);
    expect(pages).toEqual([1]);
    expect(indices).toEqual([]);
    component.hasNextPage = false;
    navigate(2);
    expect(pages).toEqual([1]);
    component.activeIndex = 0;
    component.hasPreviousPage = true;
    navigate(-1);
    expect(pages).toEqual([1, -1]);
    navigate(1);
    expect(indices).toEqual([1]);
  });
});

describe('explorer keyboard on route entry', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const component = TestBed.runInInjectionContext(() => new EntitiesExplorer3dComponent({}));
    const next = vi.spyOn(component, 'next').mockImplementation(() => undefined);
    const prev = vi.spyOn(component, 'prev').mockImplementation(() => undefined);
    return { component, next, prev };
  }
  function dispatch(
    component: EntitiesExplorer3dComponent,
    element: HTMLElement,
    options: KeyboardEventInit = {},
  ) {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.addEventListener('keydown', (e) => component.onWindowKeyDown(e), {
      once: true,
    });
    element.dispatchEvent(event);
    return event;
  }
  it('moves immediately with focus left on the navigation link, even after the mouse leaves', () => {
    const { component, next, prev } = setup();
    const link = document.createElement('a');
    expect(dispatch(component, link).defaultPrevented).toBe(true);
    component.onMouseLeave();
    dispatch(component, document.createElement('div'), { key: 'ArrowLeft' });
    expect(next).toHaveBeenCalledOnce();
    expect(prev).toHaveBeenCalledOnce();
  });
  it('leaves text editing, buttons, tab controls and modified keys alone', () => {
    const { component, next } = setup();
    for (const tag of ['input', 'textarea', 'select', 'button']) {
      expect(dispatch(component, document.createElement(tag)).defaultPrevented).toBe(false);
    }
    const tab = document.createElement('div');
    tab.setAttribute('role', 'tablist');
    expect(dispatch(component, tab).defaultPrevented).toBe(false);
    expect(
      dispatch(component, document.createElement('div'), { ctrlKey: true }).defaultPrevented,
    ).toBe(false);
    expect(
      dispatch(component, document.createElement('div'), { isComposing: true }).defaultPrevented,
    ).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });
  it('does not move cards behind an open modal', () => {
    const { component, next } = setup();
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    try {
      expect(dispatch(component, document.body).defaultPrevented).toBe(false);
      expect(next).not.toHaveBeenCalled();
    } finally {
      dialog.remove();
    }
  });
});

it('uses the first arrow during entry and clears the navigation link focus', () => {
  TestBed.configureTestingModule({
    providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
  });
  const component = TestBed.runInInjectionContext(() => new EntitiesExplorer3dComponent({}));
  const next = vi.spyOn(component, 'next').mockImplementation(() => undefined);
  const scene = (
    component as unknown as {
      scene: { completeEntryAnimation(): void; _entryAnimationState: string };
    }
  ).scene;
  scene._entryAnimationState = 'running';
  const finish = vi.spyOn(scene, 'completeEntryAnimation').mockImplementation(() => {
    scene._entryAnimationState = 'complete';
  });
  const nav = document.createElement('nav');
  nav.className = 'app-chrome__nav';
  const link = document.createElement('a');
  link.href = '/home';
  nav.append(link);
  document.body.append(nav);
  link.focus();
  try {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    link.addEventListener('keydown', (e) => component.onWindowKeyDown(e), { once: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(link);
    expect(finish).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  } finally {
    nav.remove();
  }
});
