import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Collection, CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

export type DetailPopupKind = 'saved' | 'manage' | 'removed' | 'share' | 'error' | 'collections';

@Injectable()
export class EntitySavedCollectionsFacade implements OnDestroy {
  readonly isSaved = signal(false);
  readonly saveLoading = signal(false);
  readonly saveStatusResolved = signal(false);
  readonly showCollectionsPanel = signal(false);
  readonly collectionsLoading = signal(false);
  readonly addingToCollection = signal(false);
  readonly creatingCollection = signal(false);
  readonly collectionsChooserOpen = signal(false);
  readonly popupKind = signal<DetailPopupKind>('saved');
  readonly popupTitle = signal('');
  readonly collectionMessage = signal('');
  readonly createCollectionName = signal('');
  readonly createCollectionDescription = signal('');

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private popupAutoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly collections$: Observable<Collection[]>;

  constructor(
    private readonly savedApi: SavedApi,
    private readonly collectionsApi: CollectionsApi,
    private readonly auth: AuthService,
    private readonly i18n: I18nService,
  ) {
    this.collections$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
      switchMap(([user]) => {
        if (!user) {
          this.collectionsLoading.set(false);
          return of([]);
        }
        this.collectionsLoading.set(true);
        return this.collectionsApi.list().pipe(
          tap(() => this.collectionsLoading.set(false)),
          catchError(() => {
            this.collectionsLoading.set(false);
            return of([]);
          }),
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  ngOnDestroy(): void {
    this.clearPopupAutoClose();
  }

  reset(): void {
    this.isSaved.set(false);
    this.saveStatusResolved.set(false);
    this.closeCollectionsPanel();
  }

  resolveSavedStatus(entityId: string): void {
    if (!this.auth.isLoggedIn) {
      this.isSaved.set(false);
      this.saveStatusResolved.set(true);
      return;
    }
    this.savedApi.check(entityId).subscribe({
      next: ({ saved }) => {
        this.isSaved.set(saved);
        this.saveStatusResolved.set(true);
      },
      error: () => {
        this.isSaved.set(false);
        this.saveStatusResolved.set(true);
      },
    });
  }

  toggleSave(entityId: string): void {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;
    if (this.isSaved()) {
      this.openPopup(
        'manage',
        this.i18n.t('popup.manage.title'),
        this.i18n.t('popup.manage.message'),
      );
      return;
    }
    this.saveLoading.set(true);
    this.savedApi.save(entityId).subscribe({
      next: () => {
        this.isSaved.set(true);
        this.saveLoading.set(false);
        this.openPopup(
          'saved',
          this.i18n.t('popup.saved.title'),
          this.i18n.t('popup.saved.message'),
        );
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', this.i18n.t('error.saveFailed'), this.i18n.t('error.tryAgain'));
      },
    });
  }

  removeSavedEntity(entityId: string): void {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;
    this.saveLoading.set(true);
    this.savedApi.remove(entityId).subscribe({
      next: () => {
        this.isSaved.set(false);
        this.saveLoading.set(false);
        this.openPopup(
          'removed',
          this.i18n.t('popup.removed.title'),
          this.i18n.t('popup.removed.message'),
          { autoCloseMs: 2200 },
        );
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', this.i18n.t('error.removeFailed'), this.i18n.t('error.tryAgain'));
      },
    });
  }

  toggleCollectionsPanel(): void {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.update((visible) => {
      if (visible) {
        this.collectionsChooserOpen.set(false);
        this.collectionMessage.set('');
      }
      return !visible;
    });
  }

  closeCollectionsPanel(): void {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.set(false);
    this.collectionsChooserOpen.set(false);
    this.popupTitle.set('');
    this.collectionMessage.set('');
  }

  openCollectionsChooser(): void {
    this.openPopup(
      'collections',
      this.i18n.t('collection.addTo'),
      this.i18n.t('collection.chooseForEntity'),
      { showChooser: true },
    );
  }

  createCollectionAndAttach(entityId: string): void {
    const name = this.createCollectionName().trim();
    const description = this.createCollectionDescription().trim();
    if (!name || this.creatingCollection()) return;
    this.creatingCollection.set(true);
    this.clearPopupAutoClose();
    this.popupKind.set('collections');
    this.collectionMessage.set('');
    this.collectionsApi.create({ name, description: description || undefined }).subscribe({
      next: (collection) => {
        this.createCollectionName.set('');
        this.createCollectionDescription.set('');
        this.refresh$.next();
        this.creatingCollection.set(false);
        this.addToCollection(collection.id, entityId, true);
      },
      error: (error) => {
        this.creatingCollection.set(false);
        this.popupKind.set('error');
        this.popupTitle.set(this.i18n.t('collection.createFailed'));
        this.collectionMessage.set(error?.error?.message ?? this.i18n.t('mySpace.createError'));
      },
    });
  }

  addToCollection(collectionId: string, entityId: string, createdNow = false): void {
    if (this.addingToCollection()) return;
    this.addingToCollection.set(true);
    this.collectionMessage.set('');
    this.collectionsApi.addEntity(collectionId, entityId).subscribe({
      next: () => {
        this.addingToCollection.set(false);
        this.collectionsChooserOpen.set(false);
        this.refresh$.next();
        this.popupKind.set('saved');
        this.popupTitle.set(
          createdNow ? this.i18n.t('collection.created') : this.i18n.t('collection.added'),
        );
        this.collectionMessage.set(
          createdNow
            ? this.i18n.t('collection.createdAndAdded')
            : this.i18n.t('collection.entityAdded'),
        );
        this.scheduleClose(createdNow ? 2800 : 2400);
      },
      error: (error) => {
        this.addingToCollection.set(false);
        this.popupKind.set('error');
        this.popupTitle.set(this.i18n.t('collection.addFailed'));
        this.collectionMessage.set(error?.error?.message ?? this.i18n.t('collection.addError'));
      },
    });
  }

  openPopup(
    kind: DetailPopupKind,
    title: string,
    message: string,
    options?: { showChooser?: boolean; autoCloseMs?: number },
  ): void {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.set(true);
    this.collectionsChooserOpen.set(options?.showChooser ?? false);
    this.popupKind.set(kind);
    this.popupTitle.set(title);
    this.collectionMessage.set(message);
    if (options?.autoCloseMs) this.scheduleClose(options.autoCloseMs);
  }

  private scheduleClose(delay: number): void {
    this.clearPopupAutoClose();
    this.popupAutoCloseTimer = setTimeout(() => this.closeCollectionsPanel(), delay);
  }

  private clearPopupAutoClose(): void {
    if (this.popupAutoCloseTimer !== null) clearTimeout(this.popupAutoCloseTimer);
    this.popupAutoCloseTimer = null;
  }
}
