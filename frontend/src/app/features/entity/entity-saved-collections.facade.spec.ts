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
});
