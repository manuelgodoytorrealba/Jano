import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { ImageControlsComponent } from './image-controls.component';

describe('image controls', () => {
  it('disables unavailable images and emits the existing zoom and reset actions', () => {
    TestBed.configureTestingModule({
      imports: [ImageControlsComponent],
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const fixture = TestBed.createComponent(ImageControlsComponent);
    const zoom = vi.fn();
    const reset = vi.fn();
    fixture.componentInstance.zoom.subscribe(zoom);
    fixture.componentInstance.resetView.subscribe(reset);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.every((button) => button.disabled)).toBe(true);
    fixture.componentRef.setInput('ready', true);
    fixture.componentRef.setInput('scalePercent', 114);
    fixture.componentRef.setInput('meta', { source: 'Museum', license: 'Public domain' });
    fixture.detectChanges();
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(zoom.mock.calls).toEqual([[0.88], [1.14]]);
    expect(reset).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('114%');
    const credits = (fixture.nativeElement as HTMLElement).querySelector('details')!;
    credits.open = true;
    credits
      .querySelector('summary')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(credits.open).toBe(false);
  });
});
