import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EntityDeckComponent } from './entity-deck.component';

describe('deck keyboard ownership', () => {
  it('does not cancel Enter bubbling from a native card link', async () => {
    await TestBed.configureTestingModule({
      imports: [EntityDeckComponent],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntityDeckComponent);
    fixture.componentRef.setInput('items', [
      { id: 'work', title: 'Work', image: '', ctaRoute: '/entities/artwork' },
    ]);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector(
      '.entity-deck__destination',
    ) as HTMLAnchorElement;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(link.getAttribute('href')).toBe('/entities/artwork');
    fixture.destroy();
  });
  it('does not intercept native history shortcuts or modified link clicks', () => {
    const receiver = {
      prev: vi.fn(),
      next: vi.fn(),
      isSwipeSuppressed: () => false,
      onCardClick: vi.fn(),
    };
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
      const key = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        cancelable: true,
        [modifier]: true,
      });
      EntityDeckComponent.prototype.onKey.call(receiver as unknown as EntityDeckComponent, key);
      expect(key.defaultPrevented).toBe(false);
      const click = new MouseEvent('click', { cancelable: true, [modifier]: true });
      EntityDeckComponent.prototype.onDestinationClick.call(
        receiver as unknown as EntityDeckComponent,
        click,
        { id: 'work', title: 'Work', image: '' },
      );
      expect(click.defaultPrevented).toBe(false);
    }
    expect(receiver.prev).not.toHaveBeenCalled();
    expect(receiver.onCardClick).not.toHaveBeenCalled();
  });
  it('leaves editable controls and local keyboard widgets alone', () => {
    const receiver = { prev: vi.fn(), next: vi.fn() };
    for (const markup of [
      '<input>',
      '<textarea></textarea>',
      '<select></select>',
      '<div contenteditable="true"><span></span></div>',
      '<button></button>',
      '<div role="tablist"><span></span></div>',
    ]) {
      const host = document.createElement('div');
      host.innerHTML = markup;
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      Object.defineProperty(event, 'target', {
        value: host.querySelector('span') ?? host.firstElementChild,
      });
      EntityDeckComponent.prototype.onKey.call(receiver as unknown as EntityDeckComponent, event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(receiver.next).not.toHaveBeenCalled();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    Object.defineProperty(event, 'target', { value: document.createElement('article') });
    EntityDeckComponent.prototype.onKey.call(receiver as unknown as EntityDeckComponent, event);
    expect(receiver.next).toHaveBeenCalledOnce();
  });
});
