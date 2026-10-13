import { describe, expect, it } from 'vitest';
import { EntityDetailViewComponent } from './entity-detail-view.component';

describe('entity information tabs', () => {
  it('cycles tabs with the keyboard, moves focus and leaves other keys alone', () => {
    const tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');
    const ids = ['context', 'sheet', 'relations', 'sources'];
    for (const id of ids) {
      const button = document.createElement('button');
      button.setAttribute('role', 'tab');
      button.textContent = id;
      tablist.append(button);
    }
    document.body.append(tablist);
    const state = {
      informationTabs: ids.map((id) => ({ id })),
      informationTab: 'context',
    } as unknown as EntityDetailViewComponent;
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      Object.defineProperty(event, 'currentTarget', { value: tablist.firstElementChild });
      EntityDetailViewComponent.prototype.onInformationTabKeydown.call(state, event);
      return event;
    };
    expect(press('ArrowLeft').defaultPrevented).toBe(true);
    expect(state.informationTab).toBe('sources');
    expect(document.activeElement).toBe(tablist.lastElementChild);
    press('ArrowRight');
    expect(state.informationTab).toBe('context');
    press('End');
    expect(state.informationTab).toBe('sources');
    press('Home');
    expect(state.informationTab).toBe('context');
    expect(press('Tab').defaultPrevented).toBe(false);
    tablist.remove();
  });
});
