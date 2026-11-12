import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/auth/auth.service';
import { SavedApi } from '../../core/api/saved.api';
import { CollectionsApi, Collection } from '../../core/api/collections.api';
import { ContentActionsComponent } from './content-actions.component';
import { SavedCollectionsFacade } from './saved-collections.facade';

describe('shared public content actions', () => {
  it('uses one accessible favorite, collections and share block with matching states', () => {
    TestBed.configureTestingModule({
      imports: [ContentActionsComponent],
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const fixture = TestBed.createComponent(ContentActionsComponent);
    const save = vi.fn(),
      collect = vi.fn(),
      share = vi.fn();
    fixture.componentInstance.saveToggle.subscribe(save);
    fixture.componentInstance.collectionsToggle.subscribe(collect);
    fixture.componentInstance.shareToggle.subscribe(share);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons).toHaveLength(3);
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(save).toHaveBeenCalledOnce();
    expect(collect).toHaveBeenCalledOnce();
    expect(share).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('isSaved', true);
    fixture.componentRef.setInput('collectionsOpen', true);
    fixture.componentRef.setInput('saveLoading', true);
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });
  it('persists publication favorites and collection membership using research IDs, never entity IDs', () => {
    const api = {
      check: vi.fn(() => of({ saved: false })),
      save: vi.fn(() => of({})),
      remove: vi.fn(() => of({ ok: true })),
    };
    const collections = {
      list: vi.fn(() => of([])),
      addEntity: vi.fn(() => of({})),
      removeEntity: vi.fn(() => of({ ok: true })),
    };
    const facade = new SavedCollectionsFacade(
      api as unknown as SavedApi,
      collections as unknown as CollectionsApi,
      { isLoggedIn: true, user$: new BehaviorSubject({ id: 'reader' }) } as unknown as AuthService,
      { t: (key: string) => key } as I18nService,
    );
    facade.targetType = 'research';
    facade.resolveSavedStatus('publication');
    facade.toggleSave('publication');
    expect(api.check).toHaveBeenCalledWith('publication', 'research');
    expect(api.save).toHaveBeenCalledWith('publication', 'research');
    facade.toggleSave('publication');
    expect(api.remove).toHaveBeenCalledWith('publication', 'research');
    const collection = { id: 'collection', items: [], researchItems: [] } as unknown as Collection;
    facade.toggleCollection(collection, 'publication');
    expect(collections.addEntity).toHaveBeenCalledWith('collection', 'publication', 'research');
    facade.toggleCollection(collection, 'publication');
    expect(collections.removeEntity).toHaveBeenCalledWith('collection', 'publication', 'research');
    facade.collectionMembership.set({});
    expect(
      facade.containsEntity(
        { ...collection, researchItems: [{ researchId: 'another-publication' }] } as Collection,
        'another-publication',
      ),
    ).toBe(true);
    facade.ngOnDestroy();
  });
});
