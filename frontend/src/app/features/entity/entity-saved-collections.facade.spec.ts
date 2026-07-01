import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntitySavedCollectionsFacade } from './entity-saved-collections.facade';

describe('EntitySavedCollectionsFacade', () => {
  it('saves once and exposes the saved feedback state', () => {
    const savedApi = { save: vi.fn(() => of({})) };
    const collectionsApi = { list: vi.fn(() => of([])) };
    const auth = { isLoggedIn: true, user$: new BehaviorSubject({ id: 'user' }) };
    const i18n = { t: (key: string) => key };
    const facade = new EntitySavedCollectionsFacade(
      savedApi as unknown as SavedApi,
      collectionsApi as unknown as CollectionsApi,
      auth as unknown as AuthService,
      i18n as unknown as I18nService,
    );
    facade.saveStatusResolved.set(true);

    facade.toggleSave('entity-1');

    expect(savedApi.save).toHaveBeenCalledOnce();
    expect(facade.isSaved()).toBe(true);
    expect(facade.popupKind()).toBe('saved');
  });

  it('auto-closes after adding the entity to a collection without reopening collection actions', () => {
    vi.useFakeTimers();

    const savedApi = { save: vi.fn(() => of({})) };
    const collectionsApi = {
      list: vi.fn(() => of([])),
      addEntity: vi.fn(() => of({})),
    };
    const auth = { isLoggedIn: true, user$: new BehaviorSubject({ id: 'user' }) };
    const i18n = { t: (key: string) => key };
    const facade = new EntitySavedCollectionsFacade(
      savedApi as unknown as SavedApi,
      collectionsApi as unknown as CollectionsApi,
      auth as unknown as AuthService,
      i18n as unknown as I18nService,
    );

    facade.showCollectionsPanel.set(true);
    facade.collectionsChooserOpen.set(true);
    facade.addToCollection('collection-1', 'entity-1');

    expect(facade.popupKind()).toBe('collectionSaved');
    expect(facade.collectionsChooserOpen()).toBe(false);

    vi.advanceTimersByTime(1600);

    expect(facade.showCollectionsPanel()).toBe(false);
    vi.useRealTimers();
  });
});
