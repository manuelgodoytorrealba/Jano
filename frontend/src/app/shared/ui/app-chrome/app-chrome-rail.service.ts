import { Injectable, signal } from '@angular/core';

export type ContextualRailAction = 'save' | 'share' | 'focus';

export type ContextualRailState = {
  kind: 'detail';
  isSaved: boolean;
  saveLoading: boolean;
  canSave: boolean;
  onSave: () => void;
  onShare: () => void;
  onFocus: () => void;
};

@Injectable({ providedIn: 'root' })
export class AppChromeRailService {
  readonly contextualRail = signal<ContextualRailState | null>(null);

  setContextualRail(state: ContextualRailState): void {
    this.contextualRail.set(state);
  }

  clearContextualRail(): void {
    this.contextualRail.set(null);
  }

  trigger(action: ContextualRailAction): void {
    const state = this.contextualRail();
    if (!state) {
      return;
    }

    if (action === 'save') {
      state.onSave();
      return;
    }

    if (action === 'share') {
      state.onShare();
      return;
    }

    state.onFocus();
  }
}
