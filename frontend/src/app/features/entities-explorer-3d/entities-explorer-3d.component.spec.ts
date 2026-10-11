import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntitiesExplorer3dComponent } from './entities-explorer-3d.component';

describe('explorer page boundaries', () => {
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
