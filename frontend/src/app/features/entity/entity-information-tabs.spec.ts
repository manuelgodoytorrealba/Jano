import { SimpleChange } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { EntityDetailViewComponent } from './entity-detail-view.component';

describe('entity information tabs', () => {
  it('keeps the reading state when the same entity receives a translated response', () => {
    const state = {
      informationTab: 'sheet',
      workspaceMode: 'graph',
      workspaceFocused: true,
      clearTransitionTimer: vi.fn(),
      resetRelationLimits: vi.fn(),
      syncImmersiveBodyState: vi.fn(),
      restoreNavigationState: vi.fn(),
    };
    const update = (slug: string) =>
      EntityDetailViewComponent.prototype.ngOnChanges.call(
        state as unknown as EntityDetailViewComponent,
        { entity: new SimpleChange({ slug: 'same' }, { slug }, false) },
      );
    update('same');
    expect(state.informationTab).toBe('sheet');
    expect(state.workspaceMode).toBe('graph');
    expect(state.workspaceFocused).toBe(true);
    update('different');
    expect(state.informationTab).toBe('context');
    expect(state.workspaceMode).toBe('split');
  });
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

describe('mobile entity workspace', () => {
  it('opens the requested viewer and only enters focus once', () => {
    const state = {
      workspaceFocused: false,
      setWorkspaceMode: vi.fn(),
      toggleWorkspaceFocus: vi.fn(function () {
        state.workspaceFocused = true;
      }),
    };
    const open = (mode: 'image' | 'graph') =>
      EntityDetailViewComponent.prototype.openMobileWorkspace.call(
        state as unknown as EntityDetailViewComponent,
        mode,
      );
    open('image');
    expect(state.setWorkspaceMode).toHaveBeenLastCalledWith('image');
    expect(state.toggleWorkspaceFocus).toHaveBeenCalledTimes(1);
    open('graph');
    expect(state.setWorkspaceMode).toHaveBeenLastCalledWith('graph');
    expect(state.toggleWorkspaceFocus).toHaveBeenCalledTimes(1);
  });
});

it('opens the readable relationship list and focuses its tab', () => {
  const tab = document.createElement('button');
  tab.id = 'entity-tab-relations';
  document.body.append(tab);
  const state = { informationTab: 'context', document } as unknown as EntityDetailViewComponent;
  EntityDetailViewComponent.prototype.showMobileRelations.call(state);
  expect(state.informationTab).toBe('relations');
  expect(document.activeElement).toBe(tab);
  tab.remove();
});
