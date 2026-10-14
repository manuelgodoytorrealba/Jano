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
