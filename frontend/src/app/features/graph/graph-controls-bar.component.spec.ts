import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { GraphControlsBarComponent } from './graph-controls-bar.component';
import { GraphInspectorPanelComponent } from './graph-inspector-panel.component';

describe('graph toolbar and layers', () => {
  it('separates layers from navigation and emits existing zoom actions', () => {
    TestBed.configureTestingModule({
      imports: [GraphControlsBarComponent],
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const fixture = TestBed.createComponent(GraphControlsBarComponent);
    fixture.componentRef.setInput('labelsMode', 'auto');
    fixture.componentRef.setInput('graphReady', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = vi.fn();
    fixture.componentInstance.toggleInspector.subscribe(toggle);
    root.querySelector<HTMLButtonElement>('.graph-utility-btn--layers')!.click();
    expect(toggle).toHaveBeenCalledOnce();
    expect(root.querySelector('.surface-controls')).toBeNull();
    fixture.componentRef.setInput('footerOnly', true);
    fixture.detectChanges();
    const zoom = vi.fn();
    fixture.componentInstance.graphZoom.subscribe(zoom);
    const buttons = root.querySelectorAll<HTMLButtonElement>('button');
    buttons[1].click();
    buttons[2].click();
    expect(zoom.mock.calls).toEqual([[0.88], [1.14]]);
    expect(root.querySelector('.graph-utility-btn--layers')).toBeNull();
  });
  it('keeps both kinds of filters and their actions in the compact panel', () => {
    TestBed.configureTestingModule({
      imports: [GraphInspectorPanelComponent],
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const fixture = TestBed.createComponent(GraphInspectorPanelComponent);
    fixture.componentRef.setInput('filtersOnly', true);
    fixture.componentRef.setInput('entityTypes', ['PERSON']);
    fixture.componentRef.setInput('relationTypes', ['CREATED_BY']);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const entity = vi.fn(),
      relation = vi.fn(),
      close = vi.fn();
    fixture.componentInstance.toggleEntityType.subscribe(entity);
    fixture.componentInstance.toggleRelationType.subscribe(relation);
    fixture.componentInstance.closeInspector.subscribe(close);
    root.querySelector<HTMLButtonElement>('.filter-chip')!.click();
    root.querySelector<HTMLButtonElement>('.filter-chip--relation')!.click();
    root.querySelector<HTMLButtonElement>('.graph-panel-footer__close')!.click();
    expect(entity).toHaveBeenCalledWith('PERSON');
    expect(relation).toHaveBeenCalledWith('CREATED_BY');
    expect(close).toHaveBeenCalledOnce();
    expect(root.querySelectorAll('.filter-action')).toHaveLength(2);
    expect(root.querySelector('.selection-card')).toBeNull();
  });
});
