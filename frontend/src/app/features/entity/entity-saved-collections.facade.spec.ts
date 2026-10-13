import { BehaviorSubject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Collection, CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntitySavedCollectionsFacade } from './entity-saved-collections.facade';

describe('EntitySavedCollectionsFacade', () => {
  it('saves without opening a popup and removes on the next click', () => {
    const savedApi = { save: vi.fn(() => of({})), remove: vi.fn(() => of({})) };
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
    expect(facade.showCollectionsPanel()).toBe(false);
    facade.toggleSave('entity-1');
    expect(savedApi.remove).toHaveBeenCalledWith('entity-1');
    expect(facade.isSaved()).toBe(false);
  });

  it('keeps the chooser open after adding without saving as a favorite', () => {
    vi.useFakeTimers();

    const savedApi = { save: vi.fn(() => of({})) };
    const collectionsApi = {
      list: vi.fn(() => of([])),
      addEntity: vi.fn(() => of({})),
      removeEntity: vi.fn(() => of({ ok: true })),
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
    facade.addToCollection('collection-1', 'entity-1');

    const collection = { id: 'collection-1', items: [] } as unknown as Collection;
    expect(facade.containsEntity(collection, 'entity-1')).toBe(true);
    facade.toggleCollection(collection, 'entity-1');
    expect(collectionsApi.removeEntity).toHaveBeenCalledWith('collection-1', 'entity-1');
    expect(facade.containsEntity(collection, 'entity-1')).toBe(false);
    facade.toggleCollection(collection, 'entity-1');
    expect(facade.containsEntity(collection, 'entity-1')).toBe(true);
    collectionsApi.removeEntity.mockReturnValueOnce(throwError(() => new Error('offline')));
    facade.toggleCollection(collection, 'entity-1');
    expect(facade.containsEntity(collection, 'entity-1')).toBe(true);
    expect(facade.collectionMessage()).toBe('error.removeFailed');
    expect(savedApi.save).not.toHaveBeenCalled();
    expect(facade.isSaved()).toBe(false);

    vi.advanceTimersByTime(1600);

    expect(facade.showCollectionsPanel()).toBe(true);
    vi.useRealTimers();
  });
  it('preserves the favorite on failure and exposes an inline error', () => {
    vi.useFakeTimers();
    const savedApi = { remove: vi.fn(() => throwError(() => new Error('offline'))) };
    const facade = new EntitySavedCollectionsFacade(
      savedApi as unknown as SavedApi,
      { list: () => of([]) } as unknown as CollectionsApi,
      { isLoggedIn: true, user$: new BehaviorSubject({ id: 'user' }) } as unknown as AuthService,
      { t: (key: string) => key } as unknown as I18nService,
    );
    facade.saveStatusResolved.set(true);
    facade.isSaved.set(true);
    facade.toggleSave('entity-1');
    expect(facade.isSaved()).toBe(true);
    expect(facade.showCollectionsPanel()).toBe(false);
    expect(facade.feedbackError()).toBe(true);
    expect(facade.feedback()).toContain('error.removeFailed');
    facade.ngOnDestroy();
    vi.useRealTimers();
  });
});
